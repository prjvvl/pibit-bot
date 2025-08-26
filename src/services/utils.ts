import { logger } from "./logger.js";

export function verifyEnvVariables() {
  const requiredEnvVars = [
    "SLACK_BOT_TOKEN",
    "SLACK_SIGNING_SECRET",
    "SLACK_APP_TOKEN",
    "LLM_PROVIDER",
    "ENCRYPTION_KEY",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingEnvVars.length > 0) {
    logger.error("Missing environment variables:", missingEnvVars);
    process.exit(1);
  }

  if (process.env.LLM_PROVIDER === "openai" && !process.env.OPENAI_API_KEY) {
    logger.error("Missing environment variable: OPENAI_API_KEY");
    process.exit(1);
  }

  if (process.env.LLM_PROVIDER === "gemini" && !process.env.GEMINI_API_KEY) {
    logger.error("Missing environment variable: GEMINI_API_KEY");
    process.exit(1);
  }

  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
    logger.error("Invalid ENCRYPTION_KEY: Must be a 32-byte hex string.");
    process.exit(1);
  }
}
