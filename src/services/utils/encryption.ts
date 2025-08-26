import crypto from 'crypto';
import { config } from '../../config.js';

const ENCRYPTION_KEY = config.encryption.key;
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    if (!ivHex || !encryptedHex) {
        throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
