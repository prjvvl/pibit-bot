import type { AIProvider } from "../../core/ai/providerInterface.js";
import { config } from "../../config.js";
import { FAILED_TO_GENERATE_RESPONSE_MESSAGE } from "../utils.js";
import { PromptManager } from "../../core/ai/promptManager.js";
import { OpenAI } from "openai/client.js";
import { logger } from "../../services/logger.js";
import type { Message } from "../../core/services/databaseInterface.js";

export class OpenAIProvider implements AIProvider {
  private client = new OpenAI({ apiKey: config.openaiKey! });
  private promptManager = new PromptManager();

  constructor() {
    logger.info("Initializing OpenAIProvider...");
  }

  async generateReply(
    platform: string,
    message: string,
    history: Message[],
    additionalData: string,
  ): Promise<string> {
    try {
      const prompt = this.promptManager.generatePrompt(
        config.botName,
        platform,
        message,
        history,
        additionalData,
      );
      logger.info("Generating reply with OpenAI...");

      const payload: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ];

      const res = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: payload,
        temperature: 0.3,
      });

      return (
        res.choices[0]?.message?.content ?? FAILED_TO_GENERATE_RESPONSE_MESSAGE
      );
    } catch (error) {
      logger.error("OpenAI API error:", error);
      return FAILED_TO_GENERATE_RESPONSE_MESSAGE;
    }
  }
}
