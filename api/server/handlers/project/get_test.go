package project_test

import (
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

func TestGetProjectSuccessful(t *testing.T) {
	// create a test project
	config := apitest.LoadConfig(t)
	user := apitest.CreateTestUser(t, config)
	proj, err := project.CreateProjectWithUser(config, &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(t, nil)

	req = apitest.WithAuthenticatedUser(t, req, user)
	req = apitest.WithProject(t, req, proj)

	handler := project.NewProjectGetHandler(
		config,
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	expProject := proj.ToProjectType()
	gotProject := &types.Project{}

	apitest.AssertResponseExpected(t, rr, expProject, gotProject)
}
