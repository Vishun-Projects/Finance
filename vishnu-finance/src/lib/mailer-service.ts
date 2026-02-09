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

    /**
     * Send OTP Verification Email
     */
    static async sendOTP(to: string, otp: string) {
        const subject = 'Your Verification Code - Finance App';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Verification Code</h2>
                <p>Please use the following code to verify your account or login:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="color: #0070f3; margin: 0; letter-spacing: 5px;">${otp}</h1>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    If you didn't request this code, you can safely ignore this email.
                </p>
            </div>
        `;

        return this.sendMail(to, subject, html);
    }
}
