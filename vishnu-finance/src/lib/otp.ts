export function generateOTP(): string {
    // Generate a random 6-digit number
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
}

export function formatOTP(otp: string): string {
    // Format as "123 456" for better readability in emails
    return otp.replace(/(\d{3})(\d{3})/, '$1 $2');
}
