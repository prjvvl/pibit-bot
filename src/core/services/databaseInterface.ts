export interface Message {
  from: string;
  text: string;
}

export interface Database {
  saveMessage(conversationId: string, message: Message): Promise<void>;
  getLastMessages(conversationId: string, limit: number): Promise<Message[]>;
}
