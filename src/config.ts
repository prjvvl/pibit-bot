import dotenv from 'dotenv';
dotenv.config();

export const config = {
    botName: process.env.BOT_NAME || "Prajwal's Pibit",
    slack: {
        botToken: process.env.SLACK_BOT_TOKEN || '',
        signingSecret: process.env.SLACK_SIGNING_SECRET || '',
        appToken: process.env.SLACK_APP_TOKEN || '',
    },
    provider: (process.env.LLM_PROVIDER === 'openai' || process.env.LLM_PROVIDER === 'gemini') ? process.env.LLM_PROVIDER : '',
    openaiKey: process.env.OPENAI_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY
}