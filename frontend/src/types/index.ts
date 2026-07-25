export interface GenerateFormRequest {
  prompt: string;
  conversationId?: string;
}

export interface GenerateFormResponse {
  formId: string;
  version: number;
  schema: Schema;
}

export interface ClarificationResponse {
  status: 'clarification_needed';
  conversationId: string;
  questions: string[];
}

export type ApiResponse = GenerateFormResponse | ClarificationResponse;

export interface SchemaProperty {
  type?: string;
  title?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  'x-show-when'?: {
    field: string;
    equals: any;
  };
}

export interface Schema {
  $schema?: string;
  type?: string;
  title?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  schema?: Schema;
}

export interface ConversationState {
  conversationId: string | null;
  messages: Message[];
  currentSchema: Schema | null;
  previousSchema: Schema | null;
  schemaHistory: Schema[];
  version: number;
  loading: boolean;
  error: string | null;
  clarification: string[] | null;
}
