import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider } from "../../core/ai/providerInterface.js";
import { config } from "../../config.js";
import { FAILED_TO_GENERATE_RESPONSE_MESSAGE, generatePrompt } from "../utils.js";
import { logger } from "../../services/logger.js";
import type { Message } from "../../core/services/databaseInterface.js";

export class GeminiProvider implements AIProvider {
    private genAI = new GoogleGenerativeAI(config.geminiKey!);

    async generateReply(
        platform: string,
        message: string,
        history: Message[],
        additionalData: string
    ): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = generatePrompt(config.botName, platform, message, history, additionalData);

            const res = await model.generateContent([{ text: prompt }]);

            return res.response?.text?.() ?? FAILED_TO_GENERATE_RESPONSE_MESSAGE;
        } catch (error) {
            logger.error("Gemini API error:", error);
            return FAILED_TO_GENERATE_RESPONSE_MESSAGE;
        }
    }
}
