import express from 'express';
import { verifyEnvVariables } from './services/utils.js';
import { SlackPlatform } from './platform/slack.js';
import { logger } from './services/logger.js';
import { config } from './config.js';
import { tokenStore } from './services/database/tokens.js';

verifyEnvVariables();

const app = express();

app.use((req, res, next) => {
  if (req.path === '/api/slack-events') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

const slack = new SlackPlatform();
slack.registerEvents();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/slack-events', async (req, res) => {
  if (req.body?.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  try {
    return await slack.getRequestHandler()(req, res);
  } catch (error) {
    logger.error("Error handling Slack event", { error });
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/slack-oauth', async (req, res) => {
  try {
    const code = req.query.code;
    if (typeof code !== "string") {
      return res.status(400).json({ error: "Missing code parameter" });
    }

    const params = new URLSearchParams({
      client_id: config.slack.clientId,
      client_secret: config.slack.clientSecret,
      code,
      redirect_uri: config.slack.redirectUri
    });

    const response = await fetch(`https://slack.com/api/oauth.v2.access?${params.toString()}`);
    const data = await response.json();

    if (!data.ok) throw new Error(data.error);

    tokenStore.saveToken({
      accessToken: data.access_token,
      teamId: data.team.id,
      teamName: data.team.name,
      botUserId: data.bot_user_id,
      appId: data.app_id
    });

    if (config.slack.appId) {
      res.redirect(`https://slack.com/app_redirect?app=${config.slack.appId}`);
    } else {
      res.status(200).json({ status: "ok", message: "App installed successfully" });
    }
  } catch (error) {
    logger.error("Error handling Slack OAuth callback", { error });
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(3000, '0.0.0.0', () => {
  logger.info('Server is running on port 3000');
});
