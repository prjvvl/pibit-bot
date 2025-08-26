import type { Message } from "../services/databaseInterface.js";

export class PromptManager {
  generatePrompt(
    botName: string,
    platform: string,
    message: string,
    history: Message[],
    additionalData: string,
  ): string {
    const historyText = history
      .map((msg) => `${msg.from}: ${msg.text}`)
      .join("\n");

    return `You are ${botName}, a helpful assistant on the ${platform} platform.

Current conversation:
${historyText}
User: ${message}
Additional data: ${additionalData}

Your response:`;
  }
}
