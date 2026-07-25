import { Router, Request, Response } from 'express';
import { MockLLMService } from '../services/llm';
import { ConversationManager } from '../services/conversation';
import { validateSchema } from '../services/validator';
import { GenerateFormRequest, GenerateFormResponse, ClarificationResponse, ErrorResponse } from '../types';

const router = Router();
const llmService = new MockLLMService();
const conversationManager = new ConversationManager();

const MAX_RETRIES = 2;

router.post('/api/form/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, conversationId } = req.body as GenerateFormRequest;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      const errorResp: ErrorResponse = { error: 'Prompt is required and must be a non-empty string' };
      res.status(400).json(errorResp);
      return;
    }

    // Handle mock_llm_failure query parameter
    const mockFailureParam = req.query.mock_llm_failure as string | undefined;
    let remainingFailures = 0;
    if (mockFailureParam) {
      const failureCount = parseInt(mockFailureParam, 10);
      if (!isNaN(failureCount) && failureCount > 0) {
        remainingFailures = failureCount;
      }
    }

    // Get or create conversation
    const { id: convId, isNew } = conversationManager.getOrCreateConversation(conversationId);
    const conversation = conversationManager.getConversation(convId)!;

    // Add user prompt to history
    conversationManager.addEntry(convId, { role: 'user', content: prompt });

    let lastError: string | undefined;
    let success = false;
    let result: { schema?: any; clarification?: string[] } | undefined;

    // Try up to MAX_RETRIES + 1 times
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const currentFailures = remainingFailures > 0 ? remainingFailures : 0;
      if (remainingFailures > 0) {
        remainingFailures--;
      }

      result = await llmService.generateSchema(
        attempt > 0 ? `${prompt}\n\nPrevious attempt failed: ${lastError}. Please correct the schema.` : prompt,
        conversation.history,
        conversation.currentSchema,
        currentFailures
      );

      if (result.clarification) {
        // Clarification needed - not a schema
        const clarResp: ClarificationResponse = {
          status: 'clarification_needed',
          conversationId: convId,
          questions: result.clarification,
        };
        conversationManager.addEntry(convId, {
          role: 'assistant',
          content: `Clarification needed: ${result.clarification.join(', ')}`,
        });
        res.status(200).json(clarResp);
        return;
      }

      if (result.schema) {
        const validation = validateSchema(result.schema);
        if (validation.valid) {
          success = true;
          break;
        } else {
          lastError = validation.errors?.join('; ') || 'Validation failed';
        }
      }
    }

    if (success && result?.schema) {
      // Update conversation state
      conversationManager.updateSchema(convId, result.schema);
      conversationManager.addEntry(convId, {
        role: 'assistant',
        content: 'Generated schema',
        schema: result.schema,
      });

      const resp: GenerateFormResponse = {
        formId: conversation.formId,
        version: conversation.version,
        schema: result.schema,
      };
      res.status(200).json(resp);
    } else {
      const errorResp: ErrorResponse = { error: 'Failed to generate valid schema after multiple attempts.' };
      res.status(500).json(errorResp);
    }
  } catch (err) {
    console.error('Error generating form:', err);
    const errorResp: ErrorResponse = { error: 'Internal server error' };
    res.status(500).json(errorResp);
  }
});

export default router;
