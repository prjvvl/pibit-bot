import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider } from "../../core/ai/providerInterface.js";
import { config } from "../../config.js";
import { FAILED_TO_GENERATE_RESPONSE_MESSAGE } from "../utils.js";
import { logger } from "../../services/logger.js";
import type { Message } from "../../core/services/databaseInterface.js";
import { PromptManager } from "../../core/ai/promptManager.js";

export class GeminiProvider implements AIProvider {
  private genAI = new GoogleGenerativeAI(config.geminiKey!);
  private promptManager = new PromptManager();

  constructor() {
    logger.info("Initializing GeminiProvider...");
  }

  async generateReply(
    platform: string,
    message: string,
    history: Message[],
    additionalData: string,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });
      const prompt = this.promptManager.generatePrompt(
        config.botName,
        platform,
        message,
        history,
        additionalData,
      );
      logger.info("Generating reply with Gemini...");
      const timeoutMs = 4000;
      const apiPromise = model.generateContent([{ text: prompt }]);
      let res;
      try {
        res = await Promise.race([
          apiPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), timeoutMs),
          ),
        ]);
      } catch (timeoutErr) {
        logger.error("Gemini API timeout:", timeoutErr);
        return "Sorry, the Gemini AI service did not respond in time. Please try again later.";
      }
      const geminiRes = res as typeof model.generateContent extends (
        ...args: any[]
      ) => Promise<infer R>
        ? R
        : any;
      return (
        geminiRes.response?.text?.() ?? FAILED_TO_GENERATE_RESPONSE_MESSAGE
      );
    } catch (error) {
      logger.error("Gemini API error:", error);
      return FAILED_TO_GENERATE_RESPONSE_MESSAGE;
    }
  }
}
