import { closeMainWindow, LocalStorage, showToast, Toast } from "@raycast/api";

export default async function StartTimerCommand() {
  // Closing window first so the command feels snappier
  await closeMainWindow();

  const existing = await LocalStorage.getItem<string>("timerStartedAt");

  if (existing) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Timer is already running!",
    });
    return;
  }

  await LocalStorage.setItem("timerStartedAt", new Date().toISOString());
  await showToast({
    style: Toast.Style.Success,
    title: "Successfully started timer",
  });
}
