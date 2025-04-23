import { closeMainWindow, launchCommand, LaunchType, LocalStorage, showToast, Toast } from "@raycast/api";

export default async function StopTimerCommand() {
  const existing = await LocalStorage.getItem<string>("timerStartedAt");

  if (!existing) {
    await closeMainWindow();
    showToast({
      style: Toast.Style.Failure,
      title: "Timer is not running!",
    });
    return;
  }

  await LocalStorage.removeItem("timerStartedAt");
  showToast({
    style: Toast.Style.Success,
    title: "Timer stopped!",
  });

  await launchCommand({
    name: "log-time",
    type: LaunchType.UserInitiated,
    context: {
      startedAt: existing,
    },
  });
}
