import type { JSONSchema7 } from 'json-schema';
export type { JSONSchema7 };

export interface GenerateFormRequest {
  prompt: string;
  conversationId?: string;
}

export interface GenerateFormResponse {
  formId: string;
  version: number;
  schema: JSONSchema7;
}

export interface ClarificationResponse {
  status: 'clarification_needed';
  conversationId: string;
  questions: string[];
}

export interface ErrorResponse {
  error: string;
}

export interface ConversationState {
  history: ConversationEntry[];
  currentSchema: JSONSchema7 | null;
  version: number;
  formId: string;
  createdAt: number;
}

export interface ConversationEntry {
  role: 'user' | 'assistant';
  content: string;
  schema?: JSONSchema7;
}

export interface LLMService {
  generateSchema(prompt: string, history: ConversationEntry[], currentSchema?: JSONSchema7 | null): Promise<{
    schema?: JSONSchema7;
    clarification?: string[];
  }>;
}

export interface MockFailureConfig {
  count: number;
}
