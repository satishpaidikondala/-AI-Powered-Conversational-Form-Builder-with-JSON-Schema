# AI-Powered Conversational Form Builder with JSON Schema

A full-stack application featuring a conversational AI that generates complex web forms based on natural language descriptions. The system enforces structured outputs (JSON Schema) from an LLM, manages multi-turn conversational state, and renders dynamic UIs in real-time with React.

## Architecture

```
┌─────────────┐     HTTP/JSON      ┌──────────────┐     LLM API      ┌──────────┐
│  Frontend   │ ──────────────────> │   Backend    │ ───────────────> │   LLM    │
│  (React)    │ <────────────────── │  (Express)   │ <─────────────── │  (Mock)  │
│  Port 3000  │                     │  Port 8080   │                 └──────────┘
└─────────────┘                     └──────────────┘
       │                                 │
       │                                 │
       ▼                                 ▼
  Form Renderer                   JSON Schema Validator
  (@rjsf/core)                    (ajv - Draft 7)
       │                                 │
       ▼                                 ▼
  x-show-when                      Retry Logic
  Conditional Logic                (2 retries max)
```

### Backend (Node.js + Express + TypeScript)
- **`GET /health`** - Health check endpoint returning `{"status": "healthy"}`
- **`POST /api/form/generate`** - Main conversational endpoint. Accepts a `prompt` and optional `conversationId`. Returns a JSON Schema Draft 7 form definition.
- **Conversation State** - Managed in-memory via `Map<string, ConversationState>`, keyed by conversation UUID. Each conversation tracks history, current schema, and version.
- **JSON Schema Validation** - Every LLM output is validated against the JSON Schema Draft 7 meta-schema using `ajv`. On failure, the backend retries up to 2 times, including the validation error in the subsequent prompt.
- **Ambiguity Detection** - When a prompt is ambiguous (e.g., "Make a form for booking a meeting room"), the API returns `{"status": "clarification_needed", "questions": [...]}` instead of a schema.
- **Mock LLM** - A built-in mock LLM service parses natural language prompts, extracts keywords, infers field types, and generates valid JSON Schema. Supports multi-turn refinement through schema merging.

### Frontend (React + TypeScript + Vite)
- **Split-Pane Layout** - Chat interface (`data-testid="chat-pane"`) on the left, form renderer (`data-testid="form-renderer-pane"`) on the right.
- **Real-Time Form Rendering** - Uses `@rjsf/core` to render forms dynamically from JSON Schema received from the backend.
- **Conditional Logic** - Supports the custom `x-show-when` schema property for field visibility based on other field values.
- **Schema Diff Panel** (`data-testid="schema-diff-panel"`) - Displays added (+), removed (-), and modified (~) fields between schema versions.
- **Export Panel** (`data-testid="export-panel"`) - Provides buttons to export JSON schema, copy code snippet, and copy cURL command.

## Quick Start

### Prerequisites
- Docker and Docker Compose

### Running

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd <repo-directory>
   ```

2. (Optional) Configure environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` if you want to use a real LLM provider. The default mock mode works without any API key.

3. Build and start:
   ```bash
   docker-compose up --build
   ```

4. Open the application:
   - Frontend: http://localhost:3000
   - Backend health: http://localhost:8080/health

### Usage

1. In the chat pane, type a description of the form you want (e.g., "Create a contact form with name, email, and phone fields").
2. The AI will generate a form schema and render it in the right pane.
3. Refine the form by sending follow-up messages (e.g., "Also add a password field").
4. Use the Export panel to download the schema JSON or copy code snippets.

## API Reference

### GET /health
Returns the health status of the backend service.

### POST /api/form/generate
Generates or refines a form schema.

**Request Body:**
```json
{
  "prompt": "Create a signup form with email and password",
  "conversationId": "optional-uuid-from-previous-response"
}
```

**Success Response (200):**
```json
{
  "formId": "uuid",
  "version": 1,
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "title": "Signup Form",
    "properties": {
      "email": { "type": "string", "format": "email", "title": "Email Address" },
      "password": { "type": "string", "format": "password", "title": "Password" }
    },
    "required": ["email", "password"]
  }
}
```

**Clarification Response (200):**
```json
{
  "status": "clarification_needed",
  "conversationId": "uuid",
  "questions": [
    "What time duration should the meeting be?",
    "What room features do you need?"
  ]
}
```

**Error Response (500):**
```json
{
  "error": "Failed to generate valid schema after multiple attempts."
}
```

### Testing Retry Logic
Add the query parameter `?mock_llm_failure=N` to simulate N consecutive LLM failures:
- `POST /api/form/generate?mock_llm_failure=1` - 1 failure, then success (200)
- `POST /api/form/generate?mock_llm_failure=3` - 3 failures, returns 500

## Project Structure

```
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── types/
│       │   └── index.ts
│       ├── routes/
│       │   ├── health.ts
│       │   └── form.ts
│       └── services/
│           ├── llm.ts
│           ├── validator.ts
│           └── conversation.ts
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── App.css
        ├── vite-env.d.ts
        ├── types/
        │   └── index.ts
        ├── context/
        │   └── ConversationContext.tsx
        └── components/
            ├── ChatPane.tsx
            ├── FormRendererPane.tsx
            ├── SchemaDiffPanel.tsx
            └── ExportPanel.tsx
```

## Design Decisions

- **Mock LLM as Default**: The application ships with a mock LLM that intelligently parses prompts and generates schemas, enabling development and testing without API keys or costs.
- **Schema Merging for Multi-Turn**: When refining a form, new fields are merged with existing ones, preserving previous fields while adding new ones based on the latest prompt.
- **In-Memory State**: Conversation state is stored in memory for simplicity. This is suitable for single-server deployments; production systems would use Redis or a database.
- **`@rjsf/core` for Form Rendering**: Using a battle-tested JSON Schema form library reduces development time and handles edge cases like array fields, nested objects, and validation.
- **x-show-when Handling**: Conditional fields are handled by filtering the schema passed to `@rjsf/core` based on current form data, providing clean separation of concerns.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | Backend API server port | `8080` |
| `LLM_API_KEY` | API key for the LLM provider | `"mock"` |
| `LLM_PROVIDER` | LLM provider (`openai`, `anthropic`, `gemini`, or `mock`) | `mock` |
| `MOCK_LLM` | Force mock mode (`true`/`false`) | `true` |
