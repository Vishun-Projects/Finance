import axios from 'axios';
import { MailerService } from './mailer-service';

/**
 * Unified Notification Service
 * Handles direct Telegram and Email notifications without needing n8n.
 */
export class NotificationService {
    private static getTelegramToken() {
        return process.env.TELEGRAM_BOT_TOKEN;
    }

    private static TELEGRAM_API = 'https://api.telegram.org/bot';

    /**
     * Send a direct Telegram message
     */
    static async sendTelegram(chatId: string, message: string, options: { parse_mode?: 'HTML' | 'MarkdownV2'; photo?: string } = {}) {
        const token = this.getTelegramToken();
        if (!token) {
            console.error('[NotificationService] TELEGRAM_BOT_TOKEN is missing');
            return null;
        }

        try {
            if (options.photo) {
                const response = await axios.post(`${this.TELEGRAM_API}${token}/sendPhoto`, {
                    chat_id: chatId,
                    photo: options.photo,
                    caption: message,
                    parse_mode: options.parse_mode || 'HTML'
                });
                return response.data;
            } else {
                const response = await axios.post(`${this.TELEGRAM_API}${token}/sendMessage`, {
                    chat_id: chatId,
                    text: message,
                    parse_mode: options.parse_mode || 'HTML'
                });
                return response.data;
            }
        } catch (error: any) {
            console.error('[NotificationService] Telegram send failed:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Unified user notification (Email + Telegram)
     */
    static async notifyUser(userId: string, data: { message: string; subject?: string; imageUrl?: string }) {
        const { prisma } = await import('@/lib/db');

        const [user, prefs] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
            prisma.userPreferences.findUnique({ where: { userId } })
        ]);

        if (!user || !prefs) return null;

        const results: any[] = [];

        // 1. Direct Telegram
        if (prefs.telegramEnabled && prefs.telegramUserId) {
            results.push(this.sendTelegram(prefs.telegramUserId, data.message, {
                photo: data.imageUrl,
                parse_mode: 'HTML'
            }));
        }

        // 2. Direct Email
        if (prefs.emailEnabled) {
            const email = prefs.notificationEmail || user.email;
            if (email) {
                results.push(MailerService.sendMail(
                    email,
                    data.subject || "Finance Notification",
                    `<div>${data.message.replace(/\n/g, '<br>')}</div>${data.imageUrl ? `<br><img src="${data.imageUrl}" style="max-width:100%"/>` : ''}`,
                    data.message
                ).catch(err => console.error('[NotificationService] Email failed:', err.message)));
            }
        }

        return Promise.allSettled(results);
    }

    /**
     * Broadcast to all enabled subscribers
     */
    static async broadcast(message: string, options: { subject?: string; imageUrl?: string } = {}) {
        const { prisma } = await import('@/lib/db');

        const subscribers = await prisma.userPreferences.findMany({
            where: {
                OR: [
                    { telegramEnabled: true, telegramUserId: { not: null } },
                    { emailEnabled: true }
                ]
            } as any,
            include: { user: { select: { email: true } } }
        });

        if (subscribers.length === 0) return [];

        console.log(`[NotificationService] Starting broadcast to ${subscribers.length} users...`);

        return Promise.allSettled(
            subscribers.map(sub => this.notifyUser(sub.userId, {
                message,
                subject: options.subject,
                imageUrl: options.imageUrl
            }))
        );
    }
}
