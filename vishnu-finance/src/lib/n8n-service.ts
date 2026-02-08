import axios from 'axios';
import { MailerService } from './mailer-service';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

export class N8nService {
    /**
     * Trigger a generic broadcast to all subscribers (Telegram + Email)
     */
    static async broadcastNotification(message: string) {
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

        if (subscribers.length === 0) return null;

        return Promise.allSettled(
            subscribers.map(async (sub: any) => {
                const results = [];

                // 1. Send via Telegram (n8n Webhook)
                if (sub.telegramEnabled && sub.telegramUserId) {
                    results.push(this.triggerWorkflow('broadcast_alert', {
                        telegramUserId: sub.telegramUserId,
                        message,
                        channels: { telegram: true, email: false }
                    }));
                }

                // 2. Send via Email (Direct Authenticated SMTP)
                if (sub.emailEnabled) {
                    const email = sub.notificationEmail || sub.user?.email;
                    if (email) {
                        results.push(MailerService.sendMail(
                            email,
                            "📢 Finance App: Important Broadcast",
                            `<div>${message.replace(/\n/g, '<br>')}</div>`,
                            message
                        ));
                    }
                }

                return Promise.allSettled(results);
            })
        );
    }

    /**
     * Trigger an n8n workflow via webhook
     */
    static async triggerWorkflow(event: string, data: any) {
        if (!N8N_WEBHOOK_URL) {
            console.warn('N8N_WEBHOOK_URL is not defined. Skipping trigger.');
            return null;
        }

        try {
            const response = await axios.post(N8N_WEBHOOK_URL, {
                event,
                timestamp: new Date().toISOString(),
                payload: data
            }, {
                headers: {
                    'X-N8N-API-KEY': N8N_API_KEY || ''
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Error triggering n8n workflow (${event}):`, error);
            return null;
        }
    }

    /**
     * Helper to send a notification via n8n (Telegram/WhatsApp)
     */
    static async sendNotification(userId: string, message: string, type: 'telegram' | 'whatsapp' = 'telegram') {
        const { prisma } = await import('@/lib/db');

        // Fetch both in parallel to be efficient
        const [user, prefs] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { email: true }
            }),
            prisma.userPreferences.findUnique({
                where: { userId },
                select: {
                    telegramUserId: true,
                    telegramEnabled: true,
                    emailEnabled: true,
                    notificationEmail: true
                }
            })
        ]);

        if (!user) {
            console.error(`[N8nService] User ${userId} not found for notification.`);
            return null;
        }

        const telegramUserId = (prefs?.telegramUserId && !prefs.telegramUserId.startsWith('cm'))
            ? prefs.telegramUserId
            : null;

        const payload = {
            userId,
            telegramUserId,
            userEmail: prefs?.notificationEmail || user.email,
            subject: type === 'whatsapp' ? "📱 WhatsApp Alert" : "💳 Finance Notification",
            message,
            type,
            channels: {
                telegram: !!(prefs?.telegramEnabled && prefs?.telegramUserId),
                email: !!prefs?.emailEnabled
            }
        };

        // 1. Trigger n8n for Telegram/WhatsApp
        const n8nPromise = this.triggerWorkflow('notification', payload);

        // 2. Trigger direct MailerService for Email (More reliable)
        if (prefs?.emailEnabled) {
            const email = prefs.notificationEmail || user.email;
            if (email) {
                MailerService.sendMail(
                    email,
                    payload.subject,
                    `<div>${message.replace(/\n/g, '<br>')}</div>`,
                    message
                ).catch(err => console.error('[N8nService] Direct email send failed:', err));
            }
        }

        return n8nPromise;
    }

    /**
     * Notify n8n that a new blog post has been created
     * Sends to ALL users who have Telegram notifications enabled
     */
    static async notifyBlogCreated(post: any) {
        const { prisma } = await import('@/lib/db');

        // Fetch all users with Telegram or Email notifications enabled
        const subscribers = await prisma.userPreferences.findMany({
            where: {
                OR: [
                    { telegramEnabled: true, telegramUserId: { not: null } },
                    { emailEnabled: true }
                ]
            } as any,
            include: { user: { select: { email: true } } }
        });

        if (subscribers.length === 0) {
            console.log('[N8nService] No subscribers found. Skipping broadcast.');
            return null;
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const message = `🚀 New Blog Post: ${post.title}\n\n${post.excerpt || ''}\n\nRead more: ${baseUrl}/education/posts/${post.slug}`;
        const absoluteImageUrl = post.coverImage ? (post.coverImage.startsWith('http') ? post.coverImage : `${baseUrl}${post.coverImage}`) : null;

        // Trigger processing for each subscriber
        const results = await Promise.allSettled(
            subscribers.map(async (sub: any) => {
                const results = [];

                // 1. Telegram via n8n
                if (sub.telegramEnabled && sub.telegramUserId) {
                    results.push(this.triggerWorkflow('blog_created', {
                        telegramUserId: sub.telegramUserId,
                        message,
                        imageUrl: absoluteImageUrl,
                        channels: { telegram: true, email: false },
                        post: { ...post, coverImage: absoluteImageUrl }
                    }));
                }

                // 2. Email via direct MailerService
                if (sub.emailEnabled) {
                    const email = sub.notificationEmail || sub.user?.email;
                    if (email) {
                        results.push(MailerService.sendMail(
                            email,
                            `Subscribed: New Article - ${post.title}`,
                            `<div>
                                <h2>${post.title}</h2>
                                ${post.excerpt ? `<p>${post.excerpt}</p>` : ''}
                                ${absoluteImageUrl ? `<img src="${absoluteImageUrl}" style="max-width: 100%; border-radius: 8px;" />` : ''}
                                <p><a href="${baseUrl}/education/posts/${post.slug}">Read more</a></p>
                            </div>`,
                            message
                        ));
                    }
                }

                return Promise.allSettled(results);
            })
        );

        console.log(`[N8nService] Broadcast complete. Notified ${subscribers.length} users.`);
        return results;
    }
}
