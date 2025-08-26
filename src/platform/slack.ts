import bolt from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { config } from "../config.js";
import { logger } from "../services/logger.js";
import type { Platform } from "../core/platform/platformInterface.js";
import type { AIProvider } from "../core/ai/providerInterface.js";
import { getAIProvider } from "../core/ai/providerFactory.js";
import { LRUCache } from "../services/database/cache.js";
import { tokenStore } from "../services/database/tokens.js";

export class SlackPlatform implements Platform {
  private app: bolt.App;
  private receiver: bolt.ExpressReceiver;
  private ai: AIProvider;
  private db: LRUCache;

  constructor() {
    this.receiver = new bolt.ExpressReceiver({
      signingSecret: config.slack.signingSecret,
      endpoints: "/api/slack-events",
    });

    this.app = new bolt.App({
      receiver: this.receiver,
      appToken: config.slack.appToken,
      authorize: async ({ teamId, enterpriseId }) => {
        const tokenData = teamId ? await tokenStore.loadToken(teamId) : null;
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
    this.app.event("app_mention", async ({ event, say }) => {
      try {
        const teamId = event.team;
        logger.info("Received app_mention event:", event);

        await this.react("hourglass", event.channel, event.ts, teamId);
        logger.info("Reacted with hourglass emoji");

        const additionalData = {
          user: event.user,
          type: event.type,
          ts: event.ts,
          text: event.text,
          team: teamId,
        };

        const previousMessages = await this.db.getLastMessages(
          event.thread_ts ?? event.ts
        );
        logger.info("Fetched previous messages from cache:", previousMessages);

        const reply = await this.ai.generateReply(
          "slack",
          event.text,
          previousMessages,
          JSON.stringify(additionalData)
        );
        logger.info("Generated AI reply:", reply);

        const client = await this.getClient(teamId ?? null);
        await client.chat.postMessage({
          text: reply,
          channel: event.channel,
          thread_ts: event.ts,
        });

        await this.unreact("hourglass", event.channel, event.ts, teamId);
        logger.info("Removed hourglass reaction");

        this.db.saveMessage(event.thread_ts ?? event.ts, {
          from: event.user ?? "user",
          text: event.text,
        });
        this.db.saveMessage(event.thread_ts ?? event.ts, {
          from: "bot",
          text: reply,
        });
      } catch (err) {
        logger.error("Failed to process Slack event:", err);
        try {
          await say({
            text: "Oops! Something went wrong while processing your message. Please try again later.",
            thread_ts: event.ts,
          });
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
    teamId?: string
  ): Promise<void> {
    try {
      const client = teamId ? await this.getClient(teamId) : this.app.client;
      await client.chat.postMessage({ text, channel: channelId });
    } catch (err) {
      logger.error(`Failed to send message to channel ${channelId}:`, err);
    }
  }

  private async react(
    emoji: string,
    channel: string,
    ts: string,
    teamId?: string
  ): Promise<void> {
    try {
      const client = teamId ? await this.getClient(teamId) : this.app.client;
      await client.reactions.add({ channel, name: emoji, timestamp: ts });
    } catch (err) {
      logger.warn(
        `Failed to add reaction :${emoji}: in channel ${channel}:`,
        err
      );
    }
  }

  private async unreact(
    emoji: string,
    channel: string,
    ts: string,
    teamId?: string
  ): Promise<void> {
    try {
      const client = teamId ? await this.getClient(teamId) : this.app.client;
      await client.reactions.remove({ channel, name: emoji, timestamp: ts });
    } catch (err) {
      logger.warn(
        `Failed to remove reaction :${emoji}: in channel ${channel}:`,
        err
      );
    }
  }
}
