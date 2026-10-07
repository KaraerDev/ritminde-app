import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

let handlerInstalled = false;

function installNotificationHandler() {
  if (handlerInstalled || Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowAlert: true,
      shouldPlaySound: Boolean(notification.request.content.sound),
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerInstalled = true;
}

export async function enableLocalReminders(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  installNotificationHandler();
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  return permission.granted;
}

async function androidChannel(gentleSound: boolean): Promise<string | undefined> {
  if (Platform.OS !== "android") return undefined;
  // Android locks a channel's audio behavior after creation, so sound modes get separate IDs.
  const channelId = gentleSound ? "daily-plan-audible" : "daily-plan-silent";
  await Notifications.setNotificationChannelAsync(channelId, {
    name: gentleSound ? "Günlük plan" : "Günlük plan · sessiz",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120],
    lightColor: "#244B3F",
    sound: gentleSound ? "default" : null,
  });
  return channelId;
}

export async function scheduleTaskReminder(
  title: string,
  plannedTime: string,
  gentleSound: boolean,
): Promise<string | null> {
  if (Platform.OS === "web" || !(await enableLocalReminders())) return null;
  const [hours, minutes] = plannedTime.split(":").map(Number);
  const triggerDate = new Date();
  triggerDate.setHours(hours, minutes, 0, 0);
  // If the planned time already passed, place a single soft reminder shortly ahead.
  if (triggerDate.getTime() <= Date.now()) triggerDate.setTime(Date.now() + 60_000);
  const channelId = await androidChannel(gentleSound);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Sıradaki küçük adım",
      body: title,
      sound: gentleSound ? "default" : false,
      data: { screen: "day" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      ...(channelId ? { channelId } : {}),
    },
  });
}

export async function scheduleTimerFinished(title: string, seconds: number, gentleSound = true): Promise<string | null> {
  if (Platform.OS === "web" || seconds <= 0) return null;
  if (!(await enableLocalReminders())) return null;
  const channelId = await androidChannel(gentleSound);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Odak süren tamamlandı",
      body: `${title} için ayırdığın zaman doldu. Hazır olduğunda devam et.`,
      sound: gentleSound ? "default" : false,
      data: { screen: "day" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
      ...(channelId ? { channelId } : {}),
    },
  });
}

export async function scheduleCalendarReminder(title: string, triggerDate: Date, gentleSound = true): Promise<string | null> {
  if (Platform.OS === "web" || triggerDate.getTime() <= Date.now()) return null;
  if (!(await enableLocalReminders())) return null;
  const channelId = await androidChannel(gentleSound);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Yaklaşan planın",
      body: title,
      sound: gentleSound ? "default" : false,
      data: { screen: "calendar" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      ...(channelId ? { channelId } : {}),
    },
  });
}

export async function cancelReminder(notificationId?: string): Promise<void> {
  if (!notificationId || Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
}
