import React from 'react';
import { useConversation } from '../context/ConversationContext';
import { SchemaProperty } from '../types';

interface DiffEntry {
  type: 'added' | 'removed' | 'modified';
  path: string;
  details?: string;
}

function computeDiff(oldSchema: Record<string, SchemaProperty> | undefined, newSchema: Record<string, SchemaProperty> | undefined): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const oldProps = oldSchema || {};
  const newProps = newSchema || {};

  // Find added and modified properties
  for (const [key, newProp] of Object.entries(newProps)) {
    if (!(key in oldProps)) {
      diffs.push({
        type: 'added',
        path: key,
        details: newProp.title || key,
      });
    } else {
      const oldProp = oldProps[key];
      if (JSON.stringify(oldProp) !== JSON.stringify(newProp)) {
        diffs.push({
          type: 'modified',
          path: key,
          details: `${oldProp.title || key} -> ${newProp.title || key}`,
        });
      }
    }
  }

  // Find removed properties
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      diffs.push({
        type: 'removed',
        path: key,
        details: oldProps[key].title || key,
      });
    }
  }

  return diffs;
}

export default function SchemaDiffPanel() {
  const { state } = useConversation();
  const { currentSchema, previousSchema, schemaHistory } = state;

  if (!currentSchema || schemaHistory.length < 2) {
    return null;
  }

  const oldProps = previousSchema?.properties as Record<string, SchemaProperty> | undefined;
  const newProps = currentSchema?.properties as Record<string, SchemaProperty> | undefined;
  const diffs = computeDiff(oldProps, newProps);

  if (diffs.length === 0) {
    return null;
  }

  return (
    <div data-testid="schema-diff-panel" className="schema-diff-panel">
      <h4>Schema Changes (v{state.version - 1} → v{state.version})</h4>
      <ul className="diff-list">
        {diffs.map((diff, i) => (
          <li key={i} className={`diff-item diff-${diff.type}`}>
            <span className="diff-sign">
              {diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : '~'}
            </span>
            <span className="diff-path">{diff.path}</span>
            {diff.details && <span className="diff-details">{diff.details}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
