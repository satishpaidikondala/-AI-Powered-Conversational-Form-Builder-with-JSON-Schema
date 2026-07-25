import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { ConversationState, Message, Schema, ApiResponse, GenerateFormResponse, ClarificationResponse } from '../types';

const API_BASE = '';

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_CONVERSATION_ID'; payload: string }
  | { type: 'UPDATE_SCHEMA'; payload: { schema: Schema; version: number } }
  | { type: 'SET_CLARIFICATION'; payload: string[] | null }
  | { type: 'CLEAR_CONVERSATION' };

const initialState: ConversationState = {
  conversationId: null,
  messages: [],
  currentSchema: null,
  previousSchema: null,
  schemaHistory: [],
  version: 0,
  loading: false,
  error: null,
  clarification: null,
};

function reducer(state: ConversationState, action: Action): ConversationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: action.payload };
    case 'UPDATE_SCHEMA':
      return {
        ...state,
        previousSchema: state.currentSchema,
        currentSchema: action.payload.schema,
        schemaHistory: [...state.schemaHistory, action.payload.schema],
        version: action.payload.version,
      };
    case 'SET_CLARIFICATION':
      return { ...state, clarification: action.payload };
    case 'CLEAR_CONVERSATION':
      return { ...initialState };
    default:
      return state;
  }
}

interface ConversationContextType {
  state: ConversationState;
  sendPrompt: (prompt: string) => Promise<void>;
  clearConversation: () => void;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const sendPrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    dispatch({ type: 'ADD_MESSAGE', payload: { role: 'user', content: prompt } });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_CLARIFICATION', payload: null });

    try {
      const body = JSON.stringify({
        prompt,
        conversationId: state.conversationId,
      });

      const res = await fetch(`${API_BASE}/api/form/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data: ApiResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as any).error || 'Failed to generate form');
      }

      if ('status' in data && data.status === 'clarification_needed') {
        dispatch({ type: 'SET_CONVERSATION_ID', payload: data.conversationId });
        dispatch({ type: 'SET_CLARIFICATION', payload: data.questions });
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            role: 'assistant',
            content: `I need some clarification:\n${data.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
          },
        });
      } else {
        const formData = data as GenerateFormResponse;
        dispatch({ type: 'SET_CONVERSATION_ID', payload: formData.formId });
        dispatch({
          type: 'UPDATE_SCHEMA',
          payload: { schema: formData.schema, version: formData.version },
        });
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            role: 'assistant',
            content: `Generated form schema (v${formData.version})`,
            schema: formData.schema,
          },
        });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'An error occurred' });
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { role: 'system', content: `Error: ${err.message || 'An error occurred'}` },
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.conversationId]);

  const clearConversation = useCallback(() => {
    dispatch({ type: 'CLEAR_CONVERSATION' });
  }, []);

  return (
    <ConversationContext.Provider value={{ state, sendPrompt, clearConversation }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation(): ConversationContextType {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error('useConversation must be used within ConversationProvider');
  }
  return ctx;
}
