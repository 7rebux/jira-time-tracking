import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { UserPreferences } from "../types";

export function useIsJiraCloud() {
  const [isJiraCloud, setIsJiraCloud] = useState(false);
  const userPrefs = getPreferenceValues<UserPreferences>();

  useEffect(() => {
    setIsJiraCloud(userPrefs.isJiraCloud === "cloud");
  }, [userPrefs.isJiraCloud]);

  return isJiraCloud;
}
