package policy

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

type RequestAction struct {
	Verb     types.APIVerb
	Resource types.NameOrUInt
}

// HasScopeAccess checks that a user can perform an action (`verb`) against a specific
// resource (`resource+scope`) according to a `policy`.
func HasScopeAccess(
	policy []*types.PolicyDocument,
	reqScopes map[types.PermissionScope]RequestAction,
) bool {
	// iterate through policy documents until a match is found
	for _, policyDoc := range policy {
		// check that policy document is valid for current API server
		isValid, matchDocs := populateAndVerifyPolicyDocument(
			policyDoc,
			types.ScopeHeirarchy,
			types.ProjectScope,
			types.ReadWriteVerbGroup(),
			reqScopes,
			nil,
		)

		if !isValid {
			continue
		}

		for matchScope, matchDoc := range matchDocs {
			// for the matching scope, make sure it matches the allowed resources if the
			// resource list is explicitly set
			if len(matchDoc.Resources) > 0 && reqScopes[matchScope].Verb != types.APIVerbList {
				if !isResourceAllowed(matchDoc, reqScopes[matchScope].Resource) {
					isValid = false
				}
			}

			// for the matching scope, make sure it matches the allowed verbs
			if !isVerbAllowed(matchDoc, reqScopes[matchScope].Verb) {
				isValid = false
			}
		}

		if isValid {
			return true
		}
	}

	return false
}

func isResourceAllowed(
	matchDoc *types.PolicyDocument,
	resource types.NameOrUInt,
) bool {
	valid := false

	for _, allowedResource := range matchDoc.Resources {
		if allowedResource == resource {
			valid = true
			break
		}
	}

	return valid
}

func isVerbAllowed(
	matchDoc *types.PolicyDocument,
	verb types.APIVerb,
) bool {
	valid := false

	for _, allowedVerb := range matchDoc.Verbs {
		if allowedVerb == verb {
			valid = true
		}
	}

	return valid
}

// populateAndVerifyPolicyDocument makes sure that the policy document is valid, and populates
// the policy document with values based on the parent permissions. Since we only want to
// iterate through the PolicyDocument once, we also search for a matching doc and return it.
// See test cases for examples.
func populateAndVerifyPolicyDocument(
	policyDoc *types.PolicyDocument,
	tree types.ScopeTree,
	currScope types.PermissionScope,
	parentVerbs []types.APIVerb,
	reqScopes map[types.PermissionScope]RequestAction,
	currMatchDocs map[types.PermissionScope]*types.PolicyDocument,
) (ok bool, matchDocs map[types.PermissionScope]*types.PolicyDocument) {
	if currMatchDocs == nil {
		currMatchDocs = make(map[types.PermissionScope]*types.PolicyDocument)
	}

	matchDocs = currMatchDocs
	currDoc := policyDoc

	if policyDoc == nil {
		currDoc = &types.PolicyDocument{
			Scope: currScope,
			// we only set the verbs to the parentVerbs when the policy document is nil
			// in the first place. We don't case on res.Verbs being empty, since this
			// may be desired.
			Verbs: parentVerbs,
		}
	}

	subTree, ok := tree[currDoc.Scope]

	fmt.Println(currDoc.Scope, tree, currDoc.Scope, currScope)

	if !ok || currDoc.Scope != currScope {
		return false, matchDocs
	}

	processedChildren := 0

	for currScope := range subTree {
		if _, exists := currDoc.Children[currScope]; exists {
			processedChildren++
		}

		ok, matchDocs = populateAndVerifyPolicyDocument(
			currDoc.Children[currScope],
			subTree,
			currScope,
			currDoc.Verbs,
			reqScopes,
			matchDocs,
		)

		if !ok {
			break
		}
	}

	// make sure all children of the current document were actually processed: if not,
	// the policy document is invalid
	if processedChildren != len(currDoc.Children) {
		return false, matchDocs
	}

	if _, ok := reqScopes[currScope]; ok && currDoc.Scope == currScope {
		matchDocs[currScope] = currDoc
	}

	return ok, matchDocs
}
