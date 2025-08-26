export interface Platform {
    listen(): Promise<void>;
    sendMessage(text: string, channelId: string): Promise<void>; 
}
