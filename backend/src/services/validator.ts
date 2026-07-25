import Ajv from 'ajv';
import { JSONSchema7 } from 'json-schema';

const ajv = new Ajv({ strict: false });

export function validateSchema(schema: unknown): { valid: boolean; errors?: string[] } {
  // Validate that schema is a valid JSON Schema Draft 7
  // AJV by default validates against Draft 7
  try {
    const valid = ajv.validateSchema(schema as any);
    if (!valid) {
      const errors = ajv.errors?.map(
        err => `${err.instancePath || '/'}: ${err.message}`
      ) || ['Unknown validation error'];
      return { valid: false, errors };
    }
  } catch (err: any) {
    return { valid: false, errors: [err.message || 'Schema validation error'] };
  }

  // Additionally validate the schema has required form structure
  const schemaObj = schema as JSONSchema7;
  if (!schemaObj.properties || typeof schemaObj.properties !== 'object') {
    return { valid: false, errors: ['Schema must have properties'] };
  }

  if (Object.keys(schemaObj.properties).length === 0) {
    return { valid: false, errors: ['Schema must have at least one property'] };
  }

  return { valid: true };
}
