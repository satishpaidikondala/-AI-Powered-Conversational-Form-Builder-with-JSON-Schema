import React, { useState } from 'react';
import { useConversation } from '../context/ConversationContext';

export default function ExportPanel() {
  const { state } = useConversation();
  const { currentSchema } = state;
  const [copied, setCopied] = useState<'json' | 'code' | 'curl' | null>(null);

  if (!currentSchema) {
    return (
      <div data-testid="export-panel" className="export-panel">
        <h4>Export</h4>
        <p className="empty-hint">Generate a form to see export options</p>
      </div>
    );
  }

  const schemaJson = JSON.stringify(currentSchema, null, 2);

  const generateCodeSnippet = () => {
    const props = currentSchema.properties ? Object.keys(currentSchema.properties) : [];
    return `// Generated Form Schema\nconst schema = ${schemaJson};\n\n// Form fields:\n${props.map(p => `// - ${p}`).join('\n')}`;
  };

  const generateCurlCommand = () => {
    return `curl -X POST http://localhost:8080/api/form/generate \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt": "Describe your form here"}'`;
  };

  const copyToClipboard = async (text: string, type: 'json' | 'code' | 'curl') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for non-HTTPS environments
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div data-testid="export-panel" className="export-panel">
      <h4>Export</h4>
      <div className="export-buttons">
        <button
          data-testid="export-json-button"
          className="export-btn"
          onClick={() => {
            const blob = new Blob([schemaJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'form-schema.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export JSON
        </button>
        <button
          data-testid="copy-code-button"
          className="export-btn"
          onClick={() => copyToClipboard(generateCodeSnippet(), 'code')}
        >
          {copied === 'code' ? 'Copied!' : 'Copy Code'}
        </button>
        <button
          data-testid="copy-curl-button"
          className="export-btn"
          onClick={() => copyToClipboard(generateCurlCommand(), 'curl')}
        >
          {copied === 'curl' ? 'Copied!' : 'Copy cURL'}
        </button>
      </div>
      <details className="schema-preview">
        <summary>View Schema JSON</summary>
        <pre className="schema-json">{schemaJson}</pre>
      </details>
    </div>
  );
}
