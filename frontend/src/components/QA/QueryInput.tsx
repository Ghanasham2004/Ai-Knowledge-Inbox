import React, { useState } from 'react';
import { useKnowledgeStore } from '../../store/useKnowledgeStore';
import { Sparkles, Loader2, CornerDownLeft, History, X } from 'lucide-react';

const SUGGESTIONS = [
  "Summarize key insights from my saved items",
  "What are the main tradeoffs mentioned?",
  "List any actionable recommendations",
];

export const QueryInput: React.FC = () => {
  const { askQuestion, isQuerying, items, recentQueries, removeRecentQuery } = useKnowledgeStore();
  const [query, setQuery] = useState('');

  const readyItemsCount = items.filter((i) => i.status === 'ready').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isQuerying) return;
    askQuestion(query.trim());
  };

  const handleSuggestionClick = (prompt: string) => {
    setQuery(prompt);
    askQuestion(prompt);
  };

  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-xl p-5 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h2 className="text-xs font-semibold text-content-primary">
            Ask Your Knowledge Inbox
          </h2>
        </div>
        <span className="text-[11px] text-content-muted">
          Grounded RAG Pipeline
        </span>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <textarea
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isQuerying || readyItemsCount === 0}
          placeholder={
            readyItemsCount === 0
              ? "Save a note or URL first to start querying your inbox..."
              : "Ask anything about your notes, e.g. 'What are the tradeoffs of SQLite?'"
          }
          className="w-full text-xs p-3.5 pr-20 rounded-xl bg-surface border border-border-subtle text-content-primary placeholder-content-muted/50 focus:outline-none focus:ring-1 focus:ring-accent transition-colors resize-none disabled:opacity-60"
        />

        <div className="absolute right-2.5 bottom-3.5 flex items-center space-x-1.5">
          <button
            type="submit"
            disabled={!query.trim() || isQuerying || readyItemsCount === 0}
            className="flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-all shadow-sm shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isQuerying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Ask</span>
                <CornerDownLeft className="w-3 h-3 opacity-70" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Recent Queries */}
      {recentQueries.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-content-muted flex items-center space-x-1 mr-1">
            <History className="w-3 h-3 text-content-muted" />
            <span>Recent:</span>
          </span>
          {recentQueries.map((rq) => (
            <div
              key={rq}
              className="inline-flex items-center space-x-1 bg-surface border border-border-subtle rounded-md px-2 py-0.5 text-[11px] text-content-muted hover:text-content-primary transition-colors"
            >
              <button
                type="button"
                onClick={() => handleSuggestionClick(rq)}
                disabled={isQuerying}
                className="hover:underline truncate max-w-[180px]"
                title={rq}
              >
                {rq}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRecentQuery(rq);
                }}
                className="text-content-muted hover:text-red-500 transition-colors ml-0.5"
                title="Remove from history"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggestion Pills */}
      {readyItemsCount > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-content-muted mr-1">Suggestions:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              disabled={isQuerying}
              className="text-[11px] px-2.5 py-1 rounded-md bg-surface border border-border-subtle hover:border-accent/40 text-content-muted hover:text-content-primary transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
