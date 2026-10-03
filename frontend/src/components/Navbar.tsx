import React from 'react';
import { useKnowledgeStore } from '../store/useKnowledgeStore';
import { Inbox, Moon, Sun, Sparkles, RefreshCw, HardDrive } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme, items, systemHealth, isLoadingItems, fetchItems } = useKnowledgeStore();
  const readyCount = items.filter((i) => i.status === 'ready').length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface-elevated/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand & Product identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm shadow-accent/20">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-content-primary tracking-tight">
                AI Knowledge Inbox
              </h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-border-subtle text-content-muted">
                v1.0
              </span>
            </div>
            <p className="text-xs text-content-muted hidden sm:block">
              Minimalist Second Brain &bull; Async Ingestion &bull; Grounded RAG
            </p>
          </div>
        </div>

        {/* Right: Status Badges, Refresh & Theme Toggle */}
        <div className="flex items-center space-x-3">
          {/* Knowledge Stats */}
          <div className="hidden md:flex items-center space-x-2 text-xs text-content-muted border border-border-subtle rounded-lg px-3 py-1.5 bg-surface">
            <HardDrive className="w-3.5 h-3.5 text-content-muted" />
            <span>{readyCount} of {items.length} Ready</span>
          </div>

          {/* Engine Status Badge */}
          <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border border-border-subtle bg-surface">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="font-medium text-content-primary">
              {systemHealth?.mock_mode ? 'Local Mock AI' : (systemHealth?.llm_model || 'Gemini 3.5 Flash Lite')}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchItems()}
            disabled={isLoadingItems}
            title="Refresh items"
            className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface border border-border-subtle transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingItems ? 'animate-spin' : ''}`} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
            className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface border border-border-subtle transition-colors"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
