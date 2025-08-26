import bolt from '@slack/bolt'
import { config } from "../config.js";
import { logger } from "../services/logger.js";
import type { Platform } from "../core/platform/platformInterface.js";
import type { AIProvider } from '../core/ai/providerInterface.js';
import { getAIProvider } from '../core/ai/providerFactory.js';
import { LRUCache } from '../services/database/cache.js';

export class SlackPlatform implements Platform {
    
    private app: bolt.App;
    private ai: AIProvider;
    private db: LRUCache;
    
    constructor() {
        this.app = new bolt.App({
            token: config.slack.botToken,
            signingSecret: config.slack.signingSecret,
            socketMode: true,
            appToken: config.slack.appToken
        });
        this.ai = getAIProvider();
        this.db = new LRUCache();
    }

    async listen(): Promise<void> {
        this.app.event('app_mention', async ({ payload, event, body, say }) => {
            try {
                await this.react('hourglass', payload.channel, payload.ts);

                const additionalData = {
                    user: payload.user,
                    type: payload.type,
                    ts: payload.ts,
                    text: payload.text,
                    team: payload.team,
                };

                const previousMessages = await this.db.getLastMessages(payload.thread_ts ?? payload.ts);

                const reply = await this.ai.generateReply(
                    "slack",
                    payload.text,
                    previousMessages,
                    JSON.stringify(additionalData)
                );

                await say({
                    text: reply,
                    thread_ts: payload.ts
                });

                await this.unreact('hourglass', payload.channel, payload.ts);

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

        try {
            await this.app.start();
            logger.info('Slack listener initiated');
        } catch (err) {
            logger.error('Failed to start Slack app:', err);
        }
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
