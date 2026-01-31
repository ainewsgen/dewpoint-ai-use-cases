import crypto from 'crypto';

// Encryption key from environment (fallback for dev)
// In production, ensure ENCRYPTION_KEY is set in your environment variables!
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-change-in-production-32b';
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
    // Ensure key length is 32 bytes
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) throw new Error("Invalid encrypted text format");

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
