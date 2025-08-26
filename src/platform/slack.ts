import bolt from "@slack/bolt";
import { config } from "../config.js";
import { logger } from "../services/logger.js";
import type { Platform } from "../core/platform/platformInterface.js";
import type { AIProvider } from '../core/ai/providerInterface.js';
import { getAIProvider } from '../core/ai/providerFactory.js';
import { LRUCache } from '../services/database/cache.js';

export class SlackPlatform implements Platform {
    
    private app: bolt.App;
    private receiver: bolt.ExpressReceiver;
    private ai: AIProvider;
    private db: LRUCache;
    
    constructor() {
        this.receiver = new bolt.ExpressReceiver({
            signingSecret: config.slack.signingSecret,
            endpoints: "/api/slack-events"
        });
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
                logger.info('Received app_mention event:', payload);
                await this.react('hourglass', payload.channel, payload.ts);
                logger.info('Reacted with hourglass emoji');
                const additionalData = {
                    user: payload.user,
                    type: payload.type,
                    ts: payload.ts,
                    text: payload.text,
                    team: payload.team,
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
                await say({
                    text: reply,
                    thread_ts: payload.ts
                });

                await this.unreact('hourglass', payload.channel, payload.ts);
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

    async sendMessage(text: string, channelId: string): Promise<void> {
        try {
            await this.app.client.chat.postMessage({
                text,
                channel: channelId
            });
        } catch (err) {
            logger.error(`Failed to send message to channel ${channelId}:`, err);
        }
    }

    private async react(emoji: string, channel: string, ts: string): Promise<void> {
        try {
            await this.app.client.reactions.add({
                channel,
                name: emoji,
                timestamp: ts
            });
        } catch (err) {
            logger.warn(`Failed to add reaction :${emoji}: in channel ${channel}:`, err);
        }
    }

    private async unreact(emoji: string, channel: string, ts: string): Promise<void> {
        try {
            await this.app.client.reactions.remove({
                channel,
                name: emoji,
                timestamp: ts
            });
        } catch (err) {
            logger.warn(`Failed to remove reaction :${emoji}: in channel ${channel}:`, err);
        }
    }
}
