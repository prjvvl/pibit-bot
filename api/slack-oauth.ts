import type { Request, Response } from "express";
import { config } from "../src/config.js";
import { logger } from "../src/services/logger.js";

export default async function handler(req: Request, res: Response) {
  try {
    logger.info("Handling Slack OAuth callback", { query: req.query });

    const code = req.query.code;
    if (typeof code !== "string")
      return res.status(400).json({ error: "Missing code parameter" });

    const params = new URLSearchParams();
    params.append("client_id", config.slack.clientId);
    params.append("client_secret", config.slack.clientSecret);
    params.append("code", code);
    params.append("redirect_uri", config.slack.redirectUri);

    const response = await fetch(
      `https://slack.com/api/oauth.v2.access?${params.toString()}`
    );
    const data = await response.json();
    logger.info("Slack OAuth response", { data });
    if (!data.ok) throw new Error(data.error);
    if (config.slack.appId) {
      res.writeHead(302, {
        Location: `https://slack.com/app_redirect?app=${config.slack.appId}`,
      });
      res.end();
    } else {
      res
        .status(200)
        .json({ status: "ok", message: "App installed successfully" });
    }
  } catch (error) {
    logger.error("Error handling Slack OAuth callback", { error });
    return res.status(500).json({ error });
  }
}
