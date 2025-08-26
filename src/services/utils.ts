import { logger } from "./logger.js";

export function verifyEnvVariables() {
    const requiredEnvVars = [
        'SLACK_BOT_TOKEN',
        'SLACK_SIGNING_SECRET',
        'SLACK_APP_TOKEN',
        'LLM_PROVIDER'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
        logger.error('Missing environment variables:', missingEnvVars);
        process.exit(1);
    }

    if (process.env.LLM_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
        logger.error('Missing environment variable: OPENAI_API_KEY');
        process.exit(1);
    }

    if (process.env.LLM_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
        logger.error('Missing environment variable: GEMINI_API_KEY');
        process.exit(1);
    }
}
