import nodemailer from 'nodemailer';

/**
 * Core Mailer Service for sending professional emails directly from the server.
 */
export class MailerService {
    private static transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || 'vishun.finance@gmail.com',
            pass: process.env.SMTP_PASS
        }
    });

    /**
     * Send a single email
     */
    static async sendMail(to: string, subject: string, html: string, text?: string) {
        try {
            const info = await this.transporter.sendMail({
                from: `"Finance Alerts" <${process.env.SMTP_USER || 'vishnu@finance.com'}>`, // sender address
                to,
                subject,
                text: text || html.replace(/<[^>]*>?/gm, ''), // Stripping HTML for text version
                html
            });

            console.log(`[MailerService] Message sent: %s`, info.messageId);
            return info;
        } catch (error) {
            console.error('[MailerService] Failed to send email:', error);
            throw error;
        }
    }
}
