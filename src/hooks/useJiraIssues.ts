import { useState, useEffect, useRef } from "react";
import { getIssues } from "../controllers";
import { Issue } from "../types";
import { showToast, Toast } from "@raycast/api";

// TODO: Implement caching (https://developers.raycast.com/api-reference/cache)
export function useJiraIssues(selectedProject: string | undefined) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const issuesPageGot = useRef(0);
  const issuesPageTotal = useRef(1);

  useEffect(() => {
    issuesPageGot.current = 0;
    issuesPageTotal.current = 1;
    setIssues([]);
  }, [selectedProject]);

  useEffect(() => {
    let isMounted = true;

    const fetchIssues = async () => {
      if (!selectedProject || issuesPageGot.current >= issuesPageTotal.current) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const result = await getIssues(issuesPageGot.current, selectedProject);
        if (result.data.length > 0 && isMounted) {
          setIssues((prevIssues) => {
            const allIssues = [...prevIssues, ...result.data];
            // Ensure unique keys and filter out undefined
            const uniqueIssues = Array.from(new Set(allIssues.map((i) => i.key)))
              .map((key) => allIssues.find((i) => i.key === key))
              .filter((i): i is Issue => !!i);
            return uniqueIssues;
          });

          issuesPageTotal.current = result.total;
          issuesPageGot.current += result.data.length;

          showToast(Toast.Style.Success, `Issues loaded ${issuesPageGot.current}/${issuesPageTotal.current}`);
        } else {
          setLoading(false);
          showToast(Toast.Style.Success, `Issues loaded ${issuesPageGot.current}/${issuesPageTotal.current}`);
        }
      } catch (e) {
        if (isMounted) {
          showToast(Toast.Style.Failure, "Failed to load issues", e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    };

    fetchIssues();

    return () => {
      isMounted = false;
      setLoading(false);
    };
  }, [selectedProject, issues.length]);

  return {
    issues,
    loading,
  };
}
