import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Client } from '../hooks/useNeniStore.types';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    } as any),
});

export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#8B5CF6',
        });
    }

    return finalStatus === 'granted';
}

export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Syncs the local notification schedule based on the "Traffic Light" logic
 * (15 days = Retraso, 30 days = Moroso).
 */
export async function syncClientNotifications(clients: Client[], enabled: boolean) {
    if (!enabled) {
        await cancelAllNotifications();
        return;
    }

    // Attempt to request permissions if missing, but fail silently if declined
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // Clear previous schedule to prevent duplicates
    await cancelAllNotifications();

    const now = new Date();
    
    // Limits the total number of scheduled notifications (iOS local limit is 64)
    // We will collect the nearest pending notifications and schedule the top 60
    const pendingNotifications: { title: string; body: string; date: Date }[] = [];

    for (const client of clients) {
        if (client.totalBalance <= 0) continue; // No debt

        const transactions = client.transactions || [];
        if (transactions.length === 0) continue; // Cannot calculate reliably without tx date

        // Find last transaction
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastDate = new Date(sortedTransactions[0].date);
        
        if (isNaN(lastDate.getTime())) continue;

        // Day 15 (Retraso)
        const day15 = new Date(lastDate);
        day15.setDate(day15.getDate() + 15);
        day15.setHours(9, 0, 0, 0);

        // Day 30 (Moroso)
        const day30 = new Date(lastDate);
        day30.setDate(day30.getDate() + 30);
        day30.setHours(9, 0, 0, 0);

        if (day15 > now) {
            pendingNotifications.push({
                title: '🟡 Cliente en Retraso',
                body: `${client.name} lleva 15 días sin realizar un pago. Saldo pendiente: $${client.totalBalance}.`,
                date: day15
            });
        }

        if (day30 > now) {
             pendingNotifications.push({
                title: '🔴 Cliente Moroso',
                body: `${client.name} ya suma 30 días sin abonar. Su deuda es de $${client.totalBalance}.`,
                date: day30
            });
        }
    }

    // Sort by nearest date first to ensure we schedule the most relevant ones within OS limits
    pendingNotifications.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Max 60 to be safe on iOS
    const notificationsToSchedule = pendingNotifications.slice(0, 60);

    for (const notif of notificationsToSchedule) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: notif.title,
                body: notif.body,
                sound: true,
            },
            trigger: { 
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: notif.date 
            },
        });
    }
}
