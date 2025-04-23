import { launchCommand, LaunchType, LocalStorage, MenuBarExtra } from "@raycast/api";
import { useEffect, useMemo } from "react";
import { useState } from "react";
import { formatElapsedTimeToJiraFormat } from "./utils";

export default function MenuBarTimer() {
  const [timerStartedAt, setTimerStartedAt] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const formattedTime = useMemo(() => {
    return timerStartedAt
      ? formatElapsedTimeToJiraFormat(Math.floor((new Date().getTime() - new Date(timerStartedAt).getTime()) / 1000))
      : undefined;
  }, [timerStartedAt]);

  useEffect(() => {
    const fetchTimerStartedAt = async () => {
      const timerStartedAt = await LocalStorage.getItem<string>("timerStartedAt");
      setTimerStartedAt(timerStartedAt);
      setIsLoading(false);
    };
    fetchTimerStartedAt();
  }, []);

  // TODO: Conditionally hide items
  return (
    <MenuBarExtra isLoading={isLoading} icon={"command-icon.png"} title={formattedTime}>
      <MenuBarExtra.Item
        title="Start Timer"
        onAction={() => launchCommand({ name: "start-timer", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Stop Timer"
        onAction={() => launchCommand({ name: "stop-timer", type: LaunchType.UserInitiated })}
      />
    </MenuBarExtra>
  );
}
