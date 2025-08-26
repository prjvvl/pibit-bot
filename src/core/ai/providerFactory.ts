import { GeminiProvider } from "../../ai/providers/gemini.js";
import { OpenAIProvider } from "../../ai/providers/openai.js";
import { config } from "../../config.js";
import type { AIProvider } from "./providerInterface.js";

export function getAIProvider(): AIProvider {
    switch (config.provider) {
        case "openai":
            return new OpenAIProvider();
        case "gemini":
        default:
            return new GeminiProvider();
    }
}
