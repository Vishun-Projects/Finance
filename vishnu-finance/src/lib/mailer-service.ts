import nodemailer from 'nodemailer';

/**
 * Core Mailer Service for sending professional emails directly from the server.
 */
export class MailerService {
    private static _transporter: any = null;

    private static getTransporter() {
        if (!this._transporter) {
            this._transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: true,
                auth: {
                    user: process.env.SMTP_USER || 'vishun.finance@gmail.com',
                    pass: process.env.SMTP_PASS
                }
            });
        }
        return this._transporter;
    }

    /**
     * Send a single email
     */
    static async sendMail(to: string, subject: string, html: string, text?: string) {
        try {
            const transporter = this.getTransporter();
            const info = await transporter.sendMail({
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
