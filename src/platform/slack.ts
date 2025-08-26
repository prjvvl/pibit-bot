import bolt from "@slack/bolt";
import { WebClient, ErrorCode } from "@slack/web-api";
import { config } from "../config.js";
import { logger } from "../services/logger.js";
import type { Platform } from "../core/platform/platformInterface.js";
import type { AIProvider } from "../core/ai/providerInterface.js";
import { getAIProvider } from "../core/ai/providerFactory.js";
import { LRUCache } from "../services/database/cache.js";
import { tokenStore } from "../services/database/tokens.js";

class ApiError extends Error {
  constructor(
    message: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class SlackPlatform implements Platform {
  private app: bolt.App;
  private receiver: bolt.ExpressReceiver;
  private ai: AIProvider;
  private db: LRUCache;

  constructor() {
    logger.info("Initializing SlackPlatform...");
    this.receiver = new bolt.ExpressReceiver({
      signingSecret: config.slack.signingSecret,
      endpoints: "/api/slack-events",
    });

    this.app = new bolt.App({
      receiver: this.receiver,
      appToken: config.slack.appToken,
      authorize: async ({ teamId, enterpriseId }) => {
        if (!teamId) {
          throw new Error("Team ID is missing");
        }
        const tokenData = await tokenStore.loadToken(teamId);
        if (!tokenData) {
          logger.error(`No token found for team ${teamId}`);
          throw new Error(`No token found for team ${teamId}`);
        }
        return {
          botToken: tokenData.accessToken,
          botUserId: tokenData.botUserId,
        };
      },
    });

    this.ai = getAIProvider();
    this.db = new LRUCache();
  }

  registerEvents(): void {
    logger.info("Registering Slack event handlers...");
    this.app.event("app_mention", async ({ event, say }) => {
      const { team, channel, ts, thread_ts, user, text } = event;
      try {
        logger.info("Received app_mention event:", event);

        await this.updateReaction("add", "hourglass", channel, ts, team);
        logger.info("Reacted with hourglass emoji");

        const additionalData = { user, type: event.type, ts, text, team };
        const previousMessages = await this.db.getLastMessages(thread_ts ?? ts);
        logger.info("Fetched previous messages from cache:", previousMessages);

        const reply = await this.ai.generateReply(
          "slack",
          text,
          previousMessages,
          JSON.stringify(additionalData),
        );
        logger.info("Generated AI reply:", reply);

        const client = await this.getClient(team ?? null);
        await client.chat.postMessage({
          text: reply,
          channel: channel,
          thread_ts: ts,
        });

        await this.updateReaction("remove", "hourglass", channel, ts, team);
        logger.info("Removed hourglass reaction");

        this.db.saveMessage(thread_ts ?? ts, { from: user ?? "user", text });
        this.db.saveMessage(thread_ts ?? ts, { from: "bot", text: reply });
      } catch (err) {
        logger.error("Failed to process Slack event:", err);
        let errorMessage =
          "Oops! Something went wrong while processing your message. Please try again later.";
        if (err instanceof ApiError) {
          errorMessage = `Error from Slack API: ${err.message}. Please check the bot's permissions and configuration.`;
        } else if (err instanceof Error) {
          errorMessage = `An unexpected error occurred: ${err.message}`;
        }

        try {
          await say({ text: errorMessage, thread_ts: ts });
        } catch (notifyErr) {
          logger.error("Failed to notify user in Slack thread:", notifyErr);
        }
      }
    });
  }

  getRequestHandler() {
    return this.receiver.app;
  }

  private async getClient(teamId: string | null): Promise<WebClient> {
    if (!teamId) {
      logger.warn("No teamId provided, using default client");
      return this.app.client;
    }

    const tokenData = await tokenStore.loadToken(teamId);
    if (!tokenData) {
      logger.warn(`No token found for team ${teamId}, using default client`);
      return this.app.client;
    }

    return new WebClient(tokenData.accessToken);
  }

  async sendMessage(
    text: string,
    channelId: string,
    teamId?: string,
  ): Promise<void> {
    try {
      const client = teamId ? await this.getClient(teamId) : this.app.client;
      await client.chat.postMessage({ text, channel: channelId });
    } catch (err) {
      logger.error(`Failed to send message to channel ${channelId}:`, err);
      throw new ApiError(`Could not send message to channel ${channelId}`, err);
    }
  }

  private async updateReaction(
    action: "add" | "remove",
    emoji: string,
    channel: string,
    ts: string,
    teamId?: string,
  ): Promise<void> {
    try {
      const client = teamId ? await this.getClient(teamId) : this.app.client;
      const method =
        action === "add" ? client.reactions.add : client.reactions.remove;
      await method({ channel, name: emoji, timestamp: ts });
    } catch (err) {
      logger.warn(
        `Failed to ${action} reaction :${emoji}: in channel ${channel}:`,
        err,
      );
    }
  }
}
