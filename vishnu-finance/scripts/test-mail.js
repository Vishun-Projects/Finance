const { MailerService } = require('./src/lib/mailer-service');
require('dotenv').config({ path: '.env.local' });

async function main() {
    console.log('Testing MailerService...');
    const result = await MailerService.sendMail(
        'vishnu.vishwakarma@wpsgp.com',
        '🚀 Finance App: SMTP Test',
        '<h1>SMTP Test</h1><p>This is a direct test from the Finance App using authenticated SMTP.</p>'
    );
    console.log('Send result:', result);
}

main().catch(console.error);
