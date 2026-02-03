import crypto from 'crypto';

// Fail-Fast: Require encryption key to be set
if (!process.env.ENCRYPTION_KEY) {
    throw new Error("FATAL: ENCRYPTION_KEY environment variable is missing.");
}
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
    // Generate random salt and IV
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);

    // Derive key using salt
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Format: salt:iv:ciphertext
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) throw new Error("Invalid encrypted text format (v2)");

    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // Derive key using extracted salt
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
