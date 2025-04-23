import { useCallback, useEffect, useState } from "react";
import { createTimeLogSuccessMessage, formatElapsedTimeToJiraFormat, parseTimeToSeconds } from "./utils";
import { Action, ActionPanel, Detail, Form, getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { Issue, UserPreferences } from "./types";
import { useJiraProjects } from "./hooks/useJiraProjects";
import { useJiraIssues } from "./hooks/useJiraIssues";
import { postTimeLog } from "./controllers";

type LogTimeCommandProps = LaunchProps<{ launchContext: { startedAt: string } }>;

export default function LogTimeCommand({ launchContext }: LogTimeCommandProps) {
  const userPrefs = getPreferenceValues<UserPreferences>();
  const startedAtDiff = launchContext?.startedAt
    ? Math.floor((new Date().getTime() - new Date(launchContext.startedAt).getTime()) / 1000)
    : 0;

  const [selectedProject, setSelectedProject] = useState<string | undefined>(userPrefs.defaultProject);
  const [selectedIssue, setSelectedIssue] = useState<Issue | undefined>(undefined);
  const [startedAt, setStartedAt] = useState<Date>(
    launchContext?.startedAt ? new Date(launchContext.startedAt) : new Date(),
  );
  const [timeInput, setTimeInput] = useState<string>(
    startedAtDiff > 0 ? formatElapsedTimeToJiraFormat(startedAtDiff) : "",
  );
  const [description, setDescription] = useState("");
  const [totalTimeWorked, setTotalTimeWorked] = useState<number>(startedAtDiff);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { projects, loading: projectsLoading } = useJiraProjects();
  const { issues, loading: issuesLoading } = useJiraIssues(selectedProject);

  useEffect(() => {
    setSelectedIssue(undefined);
  }, [selectedProject]);

  const handleSelectIssue = useCallback(
    (key: string) => {
      setSelectedIssue(issues.find((issue) => issue.key === key));
    },
    [issues],
  );

  // Convert time input to seconds
  const handleTimeInput = useCallback(
    (value: string) => {
      if (!/^[0-9hms ]*$/.test(value)) {
        return;
      }

      setTimeInput(value);

      const totalSeconds = parseTimeToSeconds(value);

      if (totalSeconds > 0) {
        setTotalTimeWorked(totalSeconds);
      } else {
        showToast(Toast.Style.Failure, "Please enter a valid time (Greater than 0.)");
      }
    },
    [setTotalTimeWorked],
  );

  const handleSubmit = useCallback(async () => {
    if (totalTimeWorked <= 0) {
      showToast(Toast.Style.Failure, "No time entered.");
      return;
    }

    if (!selectedIssue) {
      showToast(Toast.Style.Failure, "No issue selected.");
      return;
    }

    setIsSubmitting(true);

    try {
      await postTimeLog(totalTimeWorked, selectedIssue.key, description, startedAt);
      const successMessage = createTimeLogSuccessMessage(selectedIssue.key, totalTimeWorked);
      showToast(Toast.Style.Success, successMessage);
    } catch (e) {
      showToast(Toast.Style.Failure, e instanceof Error ? e.message : "Error Logging Time");
    } finally {
      setIsSubmitting(false);
    }
  }, [totalTimeWorked, selectedIssue, description, startedAt]);

  if (!projects.length && !projectsLoading) {
    return <Detail markdown={emptyMessage} />;
  }

  return (
    <Form
      isLoading={projectsLoading || issuesLoading || isSubmitting}
      navigationTitle="Log Time"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project" value={selectedProject} onChange={setSelectedProject}>
        {projects?.map((item) => <Form.Dropdown.Item key={item.key} value={item.key} title={item.name} />)}
      </Form.Dropdown>
      <Form.Dropdown id="issueId" title="Issue" value={selectedIssue?.key} onChange={handleSelectIssue}>
        {issues.map((item) => (
          <Form.Dropdown.Item key={item.key} value={item.key} title={`${item.key}: ${item.fields.summary}`} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.DatePicker
        id="startedAt"
        title="Started At"
        value={startedAt}
        onChange={(date) => {
          date && setStartedAt(date);
        }}
      />
      <Form.TextField
        id="timeInput"
        title="Time"
        placeholder="Enter time as 'Xh Ym Zs'"
        value={timeInput}
        onChange={handleTimeInput}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Description of work completed"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}

const emptyMessage = `
# No projects found

No Jira projects were found using your credentials.

This could happen because:

-  The provided Jira domain has no associated projects.
-  The provided Jira instance is a Jira Server instance, not a Jira Cloud instance.
-  The email credential provided is not authorized to access any projects on the provided jira domain.
-  The email credential provided is incorrect.
-  The API token credential provided is incorrect.

Please check your permissions, jira account, or credentials and try again.
`;
