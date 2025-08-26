export interface Platform {
    registerEvents(): void;
    getRequestHandler(): any;
    sendMessage(text: string, channelId: string): Promise<void>;
}
