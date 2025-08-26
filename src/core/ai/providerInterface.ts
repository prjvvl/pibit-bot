import type { Message } from "../services/databaseInterface.js";

export interface AIProvider {
    generateReply(platform: string, message: string, history: Message[], additionalData: string): Promise<string>;
}