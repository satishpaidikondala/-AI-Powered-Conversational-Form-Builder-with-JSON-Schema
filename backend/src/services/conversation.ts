import { v4 as uuidv4 } from 'uuid';
import { ConversationState, ConversationEntry, JSONSchema7 } from '../types';

export class ConversationManager {
  private conversations: Map<string, ConversationState> = new Map();

  createConversation(): string {
    const id = uuidv4();
    this.conversations.set(id, {
      history: [],
      currentSchema: null,
      version: 0,
      formId: id,
      createdAt: Date.now(),
    });
    return id;
  }

  getConversation(id: string): ConversationState | undefined {
    return this.conversations.get(id);
  }

  addEntry(conversationId: string, entry: ConversationEntry): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.history.push(entry);
    }
  }

  updateSchema(conversationId: string, schema: JSONSchema7): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.currentSchema = schema;
      conv.version += 1;
    }
  }

  getOrCreateConversation(conversationId?: string): { id: string; isNew: boolean } {
    if (conversationId && this.conversations.has(conversationId)) {
      return { id: conversationId, isNew: false };
    }
    return { id: this.createConversation(), isNew: true };
  }
}
