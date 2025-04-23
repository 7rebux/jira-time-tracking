import { useState, useEffect, useRef } from "react";
import { getProjects } from "../controllers";
import { Project } from "../types";
import { showToast, Toast } from "@raycast/api";
import { useIsJiraCloud } from "./useIsJiraCloud";

// TODO: Implement caching (https://developers.raycast.com/api-reference/cache)
export function useJiraProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const isJiraCloud = useIsJiraCloud();

  const projectsPageGot = useRef(0);
  const projectsPageTotal = useRef(1);

  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      if (projectsPageGot.current >= projectsPageTotal.current) {
        setLoading(false);
        showToast(Toast.Style.Success, "All projects loaded");
        return;
      }

      setLoading(true);
      try {
        const result = await getProjects(projectsPageGot.current);
        if (result.data.length > 0 && isMounted) {
          setProjects((prevProjects) => {
            const newProjects = [...prevProjects, ...result.data];
            // Ensure unique keys and filter out undefined
            const uniqueProjects = Array.from(new Set(newProjects.map((p) => p.key)))
              .map((key) => newProjects.find((p) => p.key === key))
              .filter((p): p is Project => !!p);
            return uniqueProjects;
          });

          projectsPageGot.current += result.data.length;
          if (isJiraCloud) {
            projectsPageTotal.current = result.total;
          } else {
            projectsPageTotal.current = Math.max(projectsPageTotal.current, projectsPageGot.current + 100);
          }

          showToast(Toast.Style.Animated, `Loading projects ${projectsPageGot.current}/${projectsPageTotal.current}`);
        } else {
          setLoading(false);
          showToast(Toast.Style.Success, `Projects loaded ${projectsPageGot.current}/${projectsPageTotal.current}`);
        }
      } catch (e) {
        if (isMounted) {
          showToast(Toast.Style.Failure, "Failed to load projects", e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, [projects.length]);

  return { projects, loading };
}
