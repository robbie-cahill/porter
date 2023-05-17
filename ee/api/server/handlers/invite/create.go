//go:build ee
// +build ee

package invite

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/oauth"
)

type InviteCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewInviteCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) http.Handler {
	return &InviteCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *InviteCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tracer, _ := telemetry.InitTracer(context.Background(), c.Config().TelemetryConfig)
	defer tracer.Shutdown()

	// just for demonstration purposes
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-invite")
	defer span.End()

	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateInviteRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "message", Value: "failed to decode and validate request"})
		return
	}

	// create invite model
	invite, err := CreateInviteWithProject(request, project.ID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error creating invite with project")))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: invite.ProjectID},
		telemetry.AttributeKV{Key: "user-id", Value: invite.UserID},
		telemetry.AttributeKV{Key: "kind", Value: invite.Kind},
	)

	// write to database
	invite, err = c.Repo().Invite().CreateInvite(invite)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error creating invite in repo")))
		return
	}

	// app.Logger.Info().Msgf("New invite created: %d", invite.ID)

	if err := c.Config().UserNotifier.SendProjectInviteEmail(
		&notifier.SendProjectInviteEmailOpts{
			InviteeEmail:      request.Email,
			URL:               fmt.Sprintf("%s/api/projects/%d/invites/%s", c.Config().ServerConf.ServerURL, project.ID, invite.Token),
			Project:           project.Name,
			ProjectOwnerEmail: user.Email,
		},
	); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error sending project invite email")))
		return
	}

	res := types.CreateInviteResponse{
		Invite: invite.ToInviteType(),
	}

	c.WriteResult(w, r, res)
}

func CreateInviteWithProject(invite *types.CreateInviteRequest, projectID uint) (*models.Invite, error) {
	// generate a token and an expiry time
	expiry := time.Now().Add(7 * 24 * time.Hour)

	return &models.Invite{
		Email:     invite.Email,
		Kind:      invite.Kind,
		Expiry:    &expiry,
		ProjectID: projectID,
		Token:     oauth.CreateRandomState(),
	}, nil
}
