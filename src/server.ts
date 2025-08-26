import express from 'express';
import dotenv from 'dotenv';
import { verifyEnvVariables } from './services/utils.js';
import { SlackPlatform } from './platform/slack.js';
import { logger } from './services/logger.js';

dotenv.config();
verifyEnvVariables();

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Initialize Slack platform
const slack = new SlackPlatform();
slack.registerEvents();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Slack Events endpoint
app.post('/api/slack-events', async (req, res) => {
  if (req.body?.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }
  return slack.getRequestHandler()(req, res);
});

// Slack OAuth endpoint
app.get('/api/slack-oauth', async (req, res) => {
  try {
    logger.info("Handling Slack OAuth callback", { query: req.query });

    const code = req.query.code;
    if (typeof code !== "string")
      return res.status(400).json({ error: "Missing code parameter" });

    const params = new URLSearchParams();
    params.append("client_id", process.env.SLACK_CLIENT_ID || '');
    params.append("client_secret", process.env.SLACK_CLIENT_SECRET || '');
    params.append("code", code);
    params.append("redirect_uri", process.env.SLACK_REDIRECT_URI || '');

    const response = await fetch(
      `https://slack.com/api/oauth.v2.access?${params.toString()}`
    );
    const data = await response.json();
    logger.info("Slack OAuth response", { data });
    
    if (!data.ok) throw new Error(data.error);
    
    if (process.env.SLACK_APP_ID) {
      res.redirect(`https://slack.com/app_redirect?app=${process.env.SLACK_APP_ID}`);
    } else {
      res.status(200).json({ status: "ok", message: "App installed successfully" });
    }
  } catch (error) {
    logger.error("Error handling Slack OAuth callback", { error });
    return res.status(500).json({ error });
  }
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
