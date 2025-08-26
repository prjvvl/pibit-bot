import type { Database, Message } from "../../core/services/databaseInterface.js";
import { logger } from "../logger.js";

export class LRUCache implements Database {
    private maxConversations: number = 100;
    private maxMessages: number = 50;
    private cache: Map<string, Message[]> = new Map();

    async saveMessage(conversationId: string, message: Message): Promise<void> {
        try {
            let conv = this.cache.get(conversationId) ?? [];
            conv.push(message);
            conv = conv.slice(-this.maxMessages);
            this.cache.delete(conversationId);
            this.cache.set(conversationId, conv);

            if (this.cache.size > this.maxConversations) {
                const oldestKey = this.cache.keys().next().value;
                this.cache.delete(oldestKey!);
            }
        } catch (error) {
            logger.error(`Error saving message for conversation ${conversationId}:`, error);
        }
    }

    async getLastMessages(conversationId: string, limit: number = 5): Promise<Message[]> {
        try {
            const conv = this.cache.get(conversationId) ?? [];
            return conv.slice(-limit);
        } catch (error) {
            logger.error(`Error retrieving messages for conversation ${conversationId}:`, error);
            return [];
        }
    }
}
