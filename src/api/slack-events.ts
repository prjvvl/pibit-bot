import type { Request, Response } from "express";
import dotenv from "dotenv";
import { verifyEnvVariables } from "../services/utils.js";
import { SlackPlatform } from "../platform/slack.js";
dotenv.config();

verifyEnvVariables();
const slack = new SlackPlatform();
slack.registerEvents();

export default async function handler(req: Request, res: Response) {
  if (req.method === "POST") {
    let body = req.body;
    // On Vercel, body may not be parsed automatically
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON" });
      }
    }
    if (body && body.type === "url_verification" && body.challenge) {
      return res.status(200).json({ challenge: body.challenge });
    }
  }
  return slack.getRequestHandler()(req, res);
}
