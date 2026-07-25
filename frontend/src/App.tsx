import React from 'react';
import { ConversationProvider } from './context/ConversationContext';
import ChatPane from './components/ChatPane';
import FormRendererPane from './components/FormRendererPane';
import SchemaDiffPanel from './components/SchemaDiffPanel';
import ExportPanel from './components/ExportPanel';
import './App.css';

export default function App() {
  return (
    <ConversationProvider>
      <div className="app">
        <header className="app-header">
          <h1>AI Form Builder</h1>
        </header>
        <main className="app-main">
          <div className="left-pane">
            <ChatPane />
          </div>
          <div className="right-pane">
            <FormRendererPane />
            <div className="bottom-panels">
              <SchemaDiffPanel />
              <ExportPanel />
            </div>
          </div>
        </main>
      </div>
    </ConversationProvider>
  );
}
