import { useState, useEffect, useRef } from "react";
import { getIssues } from "../controllers";
import { Issue } from "../types";
import { showToast, Toast } from "@raycast/api";

// TODO: Implement caching (https://developers.raycast.com/api-reference/cache)
export function useJiraIssues(selectedProject: string | undefined) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const nextPageToken = useRef<string | undefined>(undefined);
  const hasMorePages = useRef(true);

  useEffect(() => {
    nextPageToken.current = undefined;
    hasMorePages.current = true;
    setIssues([]);
  }, [selectedProject]);

  useEffect(() => {
    let isMounted = true;

    const fetchIssues = async () => {
      if (!selectedProject || !hasMorePages.current) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const result = await getIssues(nextPageToken.current, selectedProject);
        if (result.data.length > 0 && isMounted) {
          setIssues((prevIssues) => {
            const allIssues = [...prevIssues, ...result.data];
            // Ensure unique keys and filter out undefined
            const uniqueIssues = Array.from(new Set(allIssues.map((i) => i.key)))
              .map((key) => allIssues.find((i) => i.key === key))
              .filter((i): i is Issue => !!i);
            return uniqueIssues;
          });

          // Update pagination state
          nextPageToken.current = result.nextPageToken;
          hasMorePages.current = !!result.nextPageToken;

          const totalLoaded = issues.length + result.data.length;

          if (hasMorePages.current) {
            // Continue fetching the next page automatically
            setTimeout(() => fetchIssues(), 100);
          } else {
            setLoading(false);
            showToast(Toast.Style.Success, `Issues loaded ${totalLoaded} (all loaded)`);
          }
        } else {
          hasMorePages.current = false;
          setLoading(false);
          showToast(Toast.Style.Success, `Issues loaded ${issues.length}`);
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
  }, [selectedProject]);

  return {
    issues,
    loading,
  };
}
