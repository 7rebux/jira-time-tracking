import { parseDate } from "./utils";
import { jiraRequest } from "./requests";
import { issuesValidator, paginationValidator, projectsValidator } from "./validators";
import { getPreferenceValues } from "@raycast/api";
import { Project } from "./types";

// Helpers to define the structure for preferences
type UserPreferences = {
  isJiraCloud: string;
  username: string;
  customJQL: string;
};

const userPrefs = getPreferenceValues<UserPreferences>();

// Helper function to determine the correct API path based on Jira type
function getApiPath(path: string): string {
  const isJiraCloud = userPrefs.isJiraCloud === "cloud";
  const version = isJiraCloud ? "3" : "2";

  // Customize endpoint paths for version compatibility
  if (!isJiraCloud) {
    if (path.includes("/project/search")) {
      path = path.replace("/rest/api/3/project/search", "/rest/api/2/project");
    } else if (path.includes("/search/jql")) {
      path = path.replace("/rest/api/3/search/jql", "/rest/api/2/search");
    } else if (path.includes("/search")) {
      path = path.replace("/rest/api/3/search", "/rest/api/2/search");
    } else {
      path = path.replace("/rest/api/3", `/rest/api/${version}`);
    }
  }
  return path;
}

export const getProjects = async (begin: number) => {
  const basePath = `/rest/api/3/project/search?maxResults=500&startAt=${begin}`;
  const apiPath = getApiPath(basePath);
  console.log(`Fetching projects from: ${apiPath}`); // Debugging log
  const response = await jiraRequest(apiPath);
  console.log(`Response from Jira: ${JSON.stringify(response)}`); // Debugging log
  return {
    total: handlePaginationResp(response),
    data: handleProjectResp(response),
  };
};

export const getIssues = async (nextPageToken?: string, projectId?: string) => {
  const jqlParts = [];

  // Add project ID filter if provided
  if (projectId) {
    jqlParts.push(`project=${projectId}`);
  }

  // Add custom JQL query from preferences
  if (userPrefs.customJQL) {
    jqlParts.push(`(${userPrefs.customJQL})`);
  }

  // Construct JQL query dynamically
  const jql = jqlParts.length > 0 ? `&jql=${jqlParts.join(" AND ")}` : "";

  // Build the base path with cursor-based pagination
  let basePath = `/rest/api/3/search/jql?fields=summary,parent,project${jql}`;
  if (nextPageToken) {
    basePath += `&nextPageToken=${nextPageToken}`;
  }

  const apiPath = getApiPath(basePath);

  console.log(`Fetching issues from: ${apiPath}`); // Debugging log
  const response = await jiraRequest(apiPath);

  return {
    data: handleIssueResp(response),
    nextPageToken: handleNextPageToken(response),
  };
};

const handlePaginationResp = (resp: unknown) => {
  // For cursor-based pagination, we don't have a total count upfront
  // Return 0 to indicate we need to fetch more pages
  return 0;
};

const handleNextPageToken = (resp: unknown) => {
  if (typeof resp === "object" && resp !== null && "nextPageToken" in resp) {
    const partial = resp as { nextPageToken: unknown };
    return typeof partial.nextPageToken === "string" ? partial.nextPageToken : undefined;
  }
  return undefined;
};

const handleProjectResp = (resp: unknown): Project[] => {
  // Validate the response using the updated `projectsValidator`
  if (!projectsValidator(resp)) {
    console.error("Invalid project response structure:", resp);
    return [];
  }

  // Handle the validated response
  if (Array.isArray(resp)) {
    // Handle API v2 structure (Jira Server)
    return resp.map((project) => ({
      key: project.key,
      name: project.name.trim(),
    }));
  } else if (resp.values) {
    // Handle API v3 structure (Jira Cloud)
    return resp.values.map((project) => ({
      key: project.key,
      name: project.name.trim(),
    }));
  }

  // This point should not be reached due to validation, but add a fallback
  console.error("Unexpected project response format after validation:", resp);
  return [];
};

const handleIssueResp = (resp: unknown) => {
  return issuesValidator(resp) ? resp.issues : [];
};

export const postTimeLog = async (timeSpentSeconds: number, issueId: string, description: string, startedAt: Date) => {
  const basePath = `/rest/api/3/issue/${issueId}/worklog?notifyUsers=false`;
  const apiPath = getApiPath(basePath);

  const isJiraCloud = userPrefs.isJiraCloud === "cloud";

  const comment = isJiraCloud
    ? {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                text: description,
                type: "text",
              },
            ],
          },
        ],
      }
    : description;

  const body = JSON.stringify({
    timeSpentSeconds,
    comment, // Use the conditionally formatted comment
    started: parseDate(startedAt),
  });

  const success = await jiraRequest(apiPath, body, "POST");
  return success;
};
