import dotenv from "dotenv";
dotenv.config();

export const config = {
  botName: process.env.BOT_NAME || "Prajwal's Pibit",
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || "",
    signingSecret: process.env.SLACK_SIGNING_SECRET || "",
    appToken: process.env.SLACK_APP_TOKEN || "",
    clientId: process.env.SLACK_CLIENT_ID || "",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "",
    redirectUri: process.env.SLACK_REDIRECT_URI || "",
    appId: process.env.SLACK_APP_ID || "",
  },
  provider:
    process.env.LLM_PROVIDER === "openai" ||
    process.env.LLM_PROVIDER === "gemini"
      ? process.env.LLM_PROVIDER
      : "",
  openaiKey: process.env.OPENAI_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  encryption: {
    key: process.env.ENCRYPTION_KEY || "",
  },
};
