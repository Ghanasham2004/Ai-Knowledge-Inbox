import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useKnowledgeStore } from '../../store/useKnowledgeStore';
import { CitationCard } from './CitationCard';
import { MessageSquare, Loader2, Bookmark, X } from 'lucide-react';

export const AnswerView: React.FC = () => {
  const { queryResult, isQuerying, queryError, clearQuery, setSelectedCitationId } = useKnowledgeStore();

  if (isQuerying) {
    return (
      <div className="bg-surface-elevated border border-border-subtle rounded-xl p-8 text-center animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent mb-3" />
        <h3 className="text-xs font-semibold text-content-primary">
          Retrieving context & synthesizing answer...
        </h3>
        <p className="mt-1 text-[11px] text-content-muted">
          Matching query vectors against saved chunks with cosine similarity.
        </p>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-red-600 dark:text-red-400">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold">Query Error</h4>
          <button onClick={clearQuery} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
        <p className="text-xs">{queryError}</p>
      </div>
    );
  }

  if (!queryResult) {
    return (
      <div className="border border-dashed border-border-subtle rounded-xl p-8 text-center bg-surface/50">
        <div className="w-10 h-10 mx-auto rounded-full bg-surface border border-border-subtle flex items-center justify-center text-content-muted mb-2.5">
          <MessageSquare className="w-5 h-5 opacity-60" />
        </div>
        <h4 className="text-xs font-semibold text-content-primary">
          No active query
        </h4>
        <p className="mt-1 text-[11px] text-content-muted max-w-xs mx-auto">
          Type a question above to retrieve relevant passages and generate grounded, cited answers.
        </p>
      </div>
    );
  }

  // Helper to parse strings containing [1], [2] into interactive citation badges
  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationId = parseInt(match[1], 10);
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCitationId(citationId);
              const el = document.getElementById(`citation-${citationId}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }}
            className="inline-flex items-center text-[10px] font-bold mx-0.5 px-1.5 py-0.5 rounded bg-accent text-white hover:bg-accent-hover transition-colors shadow-xs align-baseline"
            title={`Jump to Source [${citationId}]`}
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  // Recursively process markdown nodes to make inline citation brackets clickable
  const processChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        return renderTextWithCitations(child);
      }
      if (React.isValidElement(child) && child.props.children) {
        return React.cloneElement(child, {
          children: processChildren(child.props.children),
        } as any);
      }
      return child;
    });
  };

  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-xl p-5 shadow-sm space-y-5 transition-colors">
      {/* Header & Meta */}
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface border border-border-subtle text-accent">
              RAG Answer
            </span>
            <span className="text-[11px] text-content-muted">
              Model: {queryResult.model} {queryResult.is_mock && '(Mock Mode)'}
            </span>
          </div>
          <h3 className="text-xs font-medium text-content-muted">
            Q: "{queryResult.query}"
          </h3>
        </div>

        <button
          onClick={clearQuery}
          className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface transition-colors"
          title="Clear answer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Formatted Markdown Answer Body */}
      <div className="text-xs leading-relaxed text-content-primary font-sans">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="mb-2.5 last:mb-0 leading-relaxed text-content-primary">
                {processChildren(children)}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-content-primary">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-content-primary/90">
                {children}
              </em>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 mb-3 space-y-1.5 text-content-primary">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 mb-3 space-y-1.5 text-content-primary">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">
                {processChildren(children)}
              </li>
            ),
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 rounded bg-surface border border-border-subtle font-mono text-[11px] text-accent font-medium">
                {children}
              </code>
            ),
            h1: ({ children }) => (
              <h1 className="text-sm font-bold text-content-primary mb-2 mt-4 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xs font-bold text-content-primary mb-1.5 mt-3 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xs font-semibold text-content-primary mb-1 mt-2.5 first:mt-0">
                {children}
              </h3>
            ),
          }}
        >
          {queryResult.answer}
        </ReactMarkdown>
      </div>

      {/* Citations List */}
      {queryResult.citations.length > 0 && (
        <div className="pt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1.5">
              <Bookmark className="w-3.5 h-3.5 text-accent" />
              <h4 className="text-xs font-semibold text-content-primary">
                Cited Sources ({queryResult.citations.length})
              </h4>
            </div>
            <span className="text-[10px] text-content-muted">
              Click citation badge to highlight snippet
            </span>
          </div>

          <div className="space-y-2.5">
            {queryResult.citations.map((c) => (
              <CitationCard key={c.citation_id} citation={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
