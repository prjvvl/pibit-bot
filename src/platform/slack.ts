import bolt from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { config } from "../config.js";
import { logger } from "../services/logger.js";
import type { Platform } from "../core/platform/platformInterface.js";
import type { AIProvider } from '../core/ai/providerInterface.js';
import { getAIProvider } from '../core/ai/providerFactory.js';
import { LRUCache } from '../services/database/cache.js';
import { tokenStore } from '../services/database/tokens.js';

export class SlackPlatform implements Platform {
    private app: bolt.App;
    private receiver: bolt.ExpressReceiver;
    private ai: AIProvider;
    private db: LRUCache;
    private clients: Map<string, WebClient> = new Map();
    
    constructor() {
        this.receiver = new bolt.ExpressReceiver({
            signingSecret: config.slack.signingSecret,
            endpoints: "/api/slack-events"
        });

        // Initialize with default token
        this.app = new bolt.App({
            token: config.slack.botToken,
            receiver: this.receiver,
            appToken: config.slack.appToken
        });

        this.ai = getAIProvider();
        this.db = new LRUCache();
    }

    registerEvents(): void {

        this.app.event('app_mention', async ({ payload, event, body, say }) => {
            try {
                if (!payload.team) {
                    throw new Error('No team ID in payload');
                }
                const teamId = payload.team;
                logger.info('Received app_mention event:', payload);
                await this.react('hourglass', payload.channel, payload.ts, teamId);
                logger.info('Reacted with hourglass emoji');
                const additionalData = {
                    user: payload.user,
                    type: payload.type,
                    ts: payload.ts,
                    text: payload.text,
                    team: teamId,
                };

                const previousMessages = await this.db.getLastMessages(payload.thread_ts ?? payload.ts);
                logger.info('Fetched previous messages from cache:', previousMessages);
                const reply = await this.ai.generateReply(
                    "slack",
                    payload.text,
                    previousMessages,
                    JSON.stringify(additionalData)
                );
                logger.info('Generated AI reply:', reply);
                
                const client = await this.getClient(teamId);
                await client.chat.postMessage({
                    text: reply,
                    channel: payload.channel,
                    thread_ts: payload.ts
                });

                await this.unreact('hourglass', payload.channel, payload.ts, teamId);
                logger.info('Removed hourglass reaction');
                
                this.db.saveMessage(payload.thread_ts ?? payload.ts, { from: payload.user ?? 'user', text: payload.text });
                this.db.saveMessage(payload.thread_ts ?? payload.ts, { from: 'bot', text: reply });

            } catch (err) {
                logger.error('Failed to process Slack event:', err);
                try {
                    await say({
                        text: 'Oops! Something went wrong while processing your message. Please try again later.',
                        thread_ts: payload.ts
                    });
                } catch (notifyErr) {
                    logger.error('Failed to notify user in Slack thread:', notifyErr);
                }
            }
        });
    }

    getRequestHandler() {
        return this.receiver.app;
    }

    private async getClient(teamId: string): Promise<WebClient> {
        let client = this.clients.get(teamId);
        if (!client) {
            const tokenData = await tokenStore.loadToken(teamId);
            if (!tokenData) {
                logger.error(`No token found for team ${teamId}`);
                logger.warn(`Using default app client for team ${teamId}`);
                return this.app.client;
            }
            client = new WebClient(tokenData.accessToken);
            this.clients.set(teamId, client);
        }
        return client;
    }

    async sendMessage(text: string, channelId: string, teamId?: string): Promise<void> {
        try {
            const client = teamId 
                ? await this.getClient(teamId)
                : this.app.client;
                
            await client.chat.postMessage({
                text,
                channel: channelId
            });
        } catch (err) {
            logger.error(`Failed to send message to channel ${channelId}:`, err);
        }
    }

    private async react(emoji: string, channel: string, ts: string, teamId?: string): Promise<void> {
        try {
            const client = teamId 
                ? await this.getClient(teamId)
                : this.app.client;
                
            await client.reactions.add({
                channel,
                name: emoji,
                timestamp: ts
            });
        } catch (err) {
            logger.warn(`Failed to add reaction :${emoji}: in channel ${channel}:`, err);
        }
    }

    private async unreact(emoji: string, channel: string, ts: string, teamId?: string): Promise<void> {
        try {
            const client = teamId 
                ? await this.getClient(teamId)
                : this.app.client;
                
            await client.reactions.remove({
                channel,
                name: emoji,
                timestamp: ts
            });
        } catch (err) {
            logger.warn(`Failed to remove reaction :${emoji}: in channel ${channel}:`, err);
        }
    }
}
