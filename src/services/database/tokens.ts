import { logger } from "../logger.js";
import fs from 'fs/promises';
import path from 'path';
import { encrypt, decrypt } from '../utils/encryption.js';

interface TokenData {
    accessToken: string;
    teamId: string;
    teamName: string;
    botUserId: string;
    appId: string;
}

class TokenStore {
    private tokens: Map<string, TokenData> = new Map();
    private readonly storageDir: string;

    constructor() {
        this.storageDir = path.join(process.cwd(), 'storage', 'tokens');
        this.initStorage();
    }

    private async initStorage(): Promise<void> {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to create token storage directory:', error);
        }
    }

    private getTokenPath(teamId: string): string {
        return path.join(this.storageDir, `${teamId}.txt`);
    }

    async saveToken(data: TokenData): Promise<void> {
        try {
            this.tokens.set(data.teamId, data);

            const encryptedData = encrypt(JSON.stringify(data));
            await fs.writeFile(this.getTokenPath(data.teamId), encryptedData);
            
            logger.info(`Token saved for team ${data.teamName} (${data.teamId})`);
        } catch (error) {
            logger.error(`Error saving token for team ${data.teamId}:`, error);
            throw error;
        }
    }

    async loadToken(teamId: string): Promise<TokenData | undefined> {
        try {
            let tokenData = this.tokens.get(teamId);
            
            if (!tokenData) {
                try {
                    const encryptedData = await fs.readFile(this.getTokenPath(teamId), 'utf-8');
                    const decryptedData = decrypt(encryptedData);
                    tokenData = JSON.parse(decryptedData) as TokenData;
                    
                    this.tokens.set(teamId, tokenData);
                } catch (fileError) {
                    if ((fileError as NodeJS.ErrnoException).code !== 'ENOENT') {
                        logger.error(`Error reading token file for team ${teamId}:`, fileError);
                    }
                    return undefined;
                }
            }
            
            return tokenData;
        } catch (error) {
            logger.error(`Error loading token for team ${teamId}:`, error);
            throw error;
        }
    }
}

export const tokenStore = new TokenStore();
