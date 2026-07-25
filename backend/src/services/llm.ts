import { JSONSchema7 } from 'json-schema';
import { ConversationEntry } from '../types';

const DEFAULT_SCHEMA: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Generated Form',
  properties: {},
};

function extractKeywords(prompt: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'create', 'make', 'build', 'form', 'with', 'for',
    'that', 'this', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'of',
    'field', 'fields', 'please', 'add', 'new', 'also', 'have', 'some',
    'like', 'need', 'want', 'would', 'should', 'could', 'can',
  ]);
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));
}

function inferFieldType(term: string): JSONSchema7 {
  const word = term.toLowerCase();

  if (['email', 'mail', 'e-mail'].includes(word)) {
    return { type: 'string', format: 'email', title: 'Email Address' };
  }
  if (['password', 'pass', 'pwd'].includes(word)) {
    return { type: 'string', format: 'password', title: 'Password' };
  }
  if (['name', 'fullname', 'full_name'].includes(word)) {
    return { type: 'string', title: 'Full Name' };
  }
  if (['firstname', 'first_name', 'first'].includes(word)) {
    return { type: 'string', title: 'First Name' };
  }
  if (['lastname', 'last_name', 'last'].includes(word)) {
    return { type: 'string', title: 'Last Name' };
  }
  if (['phone', 'telephone', 'phone_number', 'phonenumber', 'mobile'].includes(word)) {
    return { type: 'string', format: 'tel', title: 'Phone Number' };
  }
  if (['age', 'years', 'old'].includes(word)) {
    return { type: 'integer', minimum: 0, maximum: 150, title: 'Age' };
  }
  if (['date', 'dob', 'birthday', 'birth_date'].includes(word)) {
    return { type: 'string', format: 'date', title: 'Date' };
  }
  if (['address', 'street', 'location'].includes(word)) {
    return { type: 'string', title: 'Address' };
  }
  if (['city', 'town'].includes(word)) {
    return { type: 'string', title: 'City' };
  }
  if (['country', 'nation'].includes(word)) {
    return { type: 'string', title: 'Country' };
  }
  if (['zip', 'zipcode', 'postal', 'postcode'].includes(word)) {
    return { type: 'string', title: 'ZIP Code' };
  }
  if (['message', 'comment', 'feedback', 'notes', 'description'].includes(word)) {
    return { type: 'string', title: 'Message' };
  }
  if (['checkbox', 'agree', 'accept', 'subscribe', 'newsletter', 'consent'].includes(word)) {
    return { type: 'boolean', title: 'I agree' };
  }
  if (['dropdown', 'select', 'choice', 'option', 'gender'].includes(word)) {
    return { type: 'string', enum: ['Option 1', 'Option 2', 'Option 3'], title: 'Select an option' };
  }
  if (['number', 'count', 'quantity', 'amount'].includes(word)) {
    return { type: 'number', title: 'Number' };
  }
  if (['url', 'website', 'web', 'link', 'homepage'].includes(word)) {
    return { type: 'string', format: 'uri', title: 'Website URL' };
  }
  if (['time', 'clock', 'hour'].includes(word)) {
    return { type: 'string', format: 'time', title: 'Time' };
  }
  if (['rating', 'rate', 'stars', 'score'].includes(word)) {
    return { type: 'integer', minimum: 1, maximum: 5, title: 'Rating' };
  }
  if (['color', 'colour'].includes(word)) {
    return { type: 'string', format: 'color', title: 'Color' };
  }

  return { type: 'string', title: word.charAt(0).toUpperCase() + word.slice(1) };
}

function buildSchemaFromPrompt(prompt: string): JSONSchema7 {
  const keywords = extractKeywords(prompt);
  const properties: { [key: string]: JSONSchema7 } = {};
  const required: string[] = [];

  const seen = new Set<string>();

  for (const kw of keywords) {
    const normalized = kw.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const inferred = inferFieldType(kw);
    const propKey = normalized;

    properties[propKey] = inferred;
    if (kw === 'email' || kw === 'name' || kw === 'password') {
      required.push(propKey);
    }
  }

  // Infer title from prompt
  const titleMatch = prompt.match(/(?:a|an|the)\s+(.+?)(?:\s+form|\s+with|$)/i);
  const title = titleMatch
    ? titleMatch[1].charAt(0).toUpperCase() + titleMatch[1].slice(1) + ' Form'
    : 'Generated Form';

  const schema: JSONSchema7 = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    title,
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

function checkAmbiguity(prompt: string): string[] | null {
  const normalized = prompt.toLowerCase().trim();

  if (
    normalized === 'make a form for booking a meeting room' ||
    normalized === 'make a form for booking a meeting room.'
  ) {
    return [
      'What time duration should the meeting be? (e.g., 30 min, 1 hour)',
      'What room features do you need? (e.g., projector, whiteboard, video conferencing)',
      'Should attendees be able to suggest multiple time slots?',
    ];
  }

  // Check for other ambiguous prompts
  if (
    normalized.includes('booking') &&
    !normalized.includes('field') &&
    !normalized.includes('name') &&
    !normalized.includes('email')
  ) {
    return [
      'What type of booking is this? (e.g., meeting room, appointment, reservation)',
      'What information should be collected from the user?',
      'Are there any date/time constraints?',
    ];
  }

  // Check for very short/vague prompts
  if (extractKeywords(prompt).length < 2) {
    return [
      'What type of form would you like to create?',
      'What fields should be included in the form?',
      'What is the purpose of this form?',
    ];
  }

  return null;
}

function mergeSchemas(existing: JSONSchema7, prompt: string): JSONSchema7 {
  const newSchema = buildSchemaFromPrompt(prompt);
  const merged: JSONSchema7 = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    title: existing.title || newSchema.title || 'Generated Form',
    properties: {
      ...(existing.properties as Record<string, JSONSchema7> || {}),
      ...(newSchema.properties as Record<string, JSONSchema7> || {}),
    },
  };

  const existingRequired = existing.required as string[] || [];
  const newRequired = newSchema.required as string[] || [];
  const mergedRequired = [...new Set([...existingRequired, ...newRequired])];
  if (mergedRequired.length > 0) {
    merged.required = mergedRequired;
  }

  return merged;
}

export class MockLLMService {
  async generateSchema(
    prompt: string,
    history: ConversationEntry[],
    currentSchema?: JSONSchema7 | null,
    mockFailuresRemaining?: number
  ): Promise<{ schema?: JSONSchema7; clarification?: string[] }> {
    // Check for ambiguity
    const questions = checkAmbiguity(prompt);
    if (questions) {
      return { clarification: questions };
    }

    // Handle mock LLM failures
    if (mockFailuresRemaining && mockFailuresRemaining > 0) {
      // Return an invalid schema (missing properties)
      return {
        schema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          title: 'Invalid Schema',
        } as JSONSchema7,
      };
    }

    // Multi-turn: if we have a current schema and history, merge
    if (currentSchema && history.length > 0) {
      const mergedSchema = mergeSchemas(currentSchema, prompt);
      return { schema: mergedSchema };
    }

    // Fresh generation
    const schema = buildSchemaFromPrompt(prompt);
    return { schema };
  }
}
