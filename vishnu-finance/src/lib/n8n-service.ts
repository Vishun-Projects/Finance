import { NotificationService } from './notification-service';

/**
 * N8n Service (Legacy/Bridge)
 * Previously used for all notifications. Now mostly delegates to NotificationService.
 */
export class N8nService {
    /**
     * Legacy broadcast - now uses direct NotificationService
     */
    static async broadcastNotification(message: string) {
        return NotificationService.broadcast(message);
    }

    /**
     * Trigger an n8n workflow (Legacy/Optional)
     * Only triggers if N8N_WEBHOOK_URL is set and not localhost.
     */
    static async triggerWorkflow(event: string, data: any) {
        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
        if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.includes('localhost')) {
            console.log(`[N8nService] Skipping n8n trigger for ${event} (No live webhook)`);
            return null;
        }

        try {
            const axios = (await import('axios')).default;
            const response = await axios.post(N8N_WEBHOOK_URL, {
                event: event,
                payload: data,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'X-N8N-SECRET-TOKEN': process.env.N8N_SECRET_TOKEN || ''
                }
            });
            return response.data;
        } catch (error) {
            console.warn(`[N8nService] Failed to trigger n8n:`, error);
            return null;
        }
    }

    /**
     * Trigger notification (Uses direct service by default)
     */
    static async sendNotification(userId: string, message: string, type: 'telegram' | 'whatsapp' = 'telegram') {
        const results = await NotificationService.notifyUser(userId, {
            message,
            subject: type === 'whatsapp' ? "📱 WhatsApp Alert" : "💳 Finance Notification"
        });

        // Optionally still trigger n8n if user wants it for custom logs/workflows
        if (process.env.N8N_WEBHOOK_URL && !process.env.N8N_WEBHOOK_URL.includes('localhost')) {
            this.triggerWorkflow('notification', { userId, message, type });
        }

        return results;
    }

    /**
     * Notify blog creation (Uses direct service)
     */
    static async notifyBlogCreated(post: any) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const message = `🚀 New Blog Post: ${post.title}\n\n${post.excerpt || ''}\n\nRead more: ${baseUrl}/education/posts/${post.slug}`;
        const absoluteImageUrl = post.coverImage ? (post.coverImage.startsWith('http') ? post.coverImage : `${baseUrl}${post.coverImage}`) : null;

        return NotificationService.broadcast(message, {
            subject: `New Article: ${post.title}`,
            imageUrl: absoluteImageUrl
        });
    }
}
