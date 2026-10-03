import React, { useEffect } from 'react';
import { useKnowledgeStore } from './store/useKnowledgeStore';
import { Navbar } from './components/Navbar';
import { IngestForm } from './components/Inbox/IngestForm';
import { ItemList } from './components/Inbox/ItemList';
import { ItemDetailModal } from './components/Inbox/ItemDetailModal';
import { QueryInput } from './components/QA/QueryInput';
import { AnswerView } from './components/QA/AnswerView';
import { Inbox, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { init } = useKnowledgeStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen bg-surface flex flex-col transition-colors selection:bg-accent/20 selection:text-accent">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Knowledge Inbox (5 cols on lg) */}
          <section className="lg:col-span-5 space-y-6">
            <div className="flex items-center space-x-2">
              <Inbox className="w-4 h-4 text-accent" />
              <h2 className="text-xs uppercase font-bold tracking-wider text-content-muted">
                1. Knowledge Ingestion & Feed
              </h2>
            </div>

            <IngestForm />

            <div className="pt-2">
              <ItemList />
            </div>
          </section>

          {/* Right Column: Grounded AI Q&A Console (7 cols on lg) */}
          <section className="lg:col-span-7 space-y-6">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="text-xs uppercase font-bold tracking-wider text-content-muted">
                2. Semantic Retrieval & Grounded RAG
              </h2>
            </div>

            <QueryInput />

            <AnswerView />
          </section>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-4 text-center text-[11px] text-content-muted bg-surface-elevated/40">
        AI Knowledge Inbox &bull; Built with FastAPI, React, Zustand, and Gemini AI RAG Pipeline
      </footer>

      {/* Global Modals */}
      <ItemDetailModal />
    </div>
  );
};

export default App;
