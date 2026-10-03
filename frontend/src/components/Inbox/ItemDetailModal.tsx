import React, { useState } from 'react';
import { useKnowledgeStore } from '../../store/useKnowledgeStore';
import { X, Copy, Check, ExternalLink, AlertTriangle, RotateCcw, Info } from 'lucide-react';

export const ItemDetailModal: React.FC = () => {
  const { activeItem, setActiveItem, retryItem } = useKnowledgeStore();
  const [tab, setTab] = useState<'cleaned' | 'raw'>('cleaned');
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  if (!activeItem) return null;

  const contentToDisplay =
    tab === 'cleaned'
      ? activeItem.cleaned_content || activeItem.raw_content || 'No content processed yet.'
      : activeItem.raw_content || 'No raw content available.';

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await retryItem(activeItem.id);
    setTimeout(() => setIsRetrying(false), 1200);
  };

  const isFailed = activeItem.status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-elevated border border-border-subtle rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-border-subtle flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface border border-border-subtle text-content-muted">
                {activeItem.type}
              </span>
              {isFailed ? (
                <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Processing Failed</span>
                </span>
              ) : (
                <span className="text-xs text-content-muted">
                  {activeItem.chunk_count} Chunks Indexed
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold text-content-primary truncate">
              {activeItem.title}
            </h2>
            {activeItem.source_url && (
              <a
                href={activeItem.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center space-x-1 text-xs text-accent hover:underline"
              >
                <span className="truncate max-w-md">{activeItem.source_url}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            )}
          </div>

          <button
            onClick={() => setActiveItem(null)}
            className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface border border-border-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Failed Error Banner */}
        {isFailed && (() => {
          const err = (activeItem.error_message || '').toLowerCase();
          let rootCauseTitle = 'Extraction Issue';
          let rootCauseDesc = 'Could not extract clean text from this URL. Click "Retry Ingestion" or paste the content directly via the "Paste Note" tab.';

          if (err.includes('403') || err.includes('forbidden') || err.includes('anti-bot')) {
            rootCauseTitle = 'Anti-Bot / Security Block (HTTP 403)';
            rootCauseDesc = 'The target website (e.g. Medium / Cloudflare) blocked automated crawler access. We upgraded our scraper with realistic browser headers, so clicking "Retry Ingestion" will re-fetch it. If blocked by a paywall, you can copy the article text and use the "Paste Note" tab.';
          } else if (err.includes('spa') || err.includes('javascript') || err.includes('readable text')) {
            rootCauseTitle = 'Client-Side Rendered SPA';
            rootCauseDesc = 'This webpage renders content dynamically in the browser using JavaScript (e.g. React/Vue). Static HTTP scrapers receive an empty shell. You can copy the article text directly and paste it into the "Paste Note" tab for instant indexing!';
          } else if (err.includes('timeout') || err.includes('timed out')) {
            rootCauseTitle = 'Connection Timed Out';
            rootCauseDesc = 'The target website took longer than 12 seconds to respond. Check if the site is reachable, or click "Retry Ingestion".';
          }

          return (
            <div className="p-4 mx-5 mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-red-600 dark:text-red-400 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Why did this fail?</span>
                </span>
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-[11px] flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'Retrying...' : 'Retry Ingestion'}</span>
                </button>
              </div>
              <p className="text-content-muted leading-relaxed font-mono text-[11px] bg-surface/50 p-2 rounded border border-border-subtle mb-2">
                {activeItem.error_message || 'Could not extract meaningful readable text from this webpage.'}
              </p>
              <div className="flex items-start space-x-1.5 text-content-muted text-[11px]">
                <Info className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Root Cause ({rootCauseTitle}):</strong> {rootCauseDesc}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Tab switcher & Copy */}
        <div className="px-5 py-2.5 bg-surface/60 border-b border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTab('cleaned')}
              className={`px-3 py-1 rounded-md transition-colors ${
                tab === 'cleaned'
                  ? 'bg-surface-elevated text-content-primary font-semibold shadow-xs'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              Extracted & Cleaned Text
            </button>
            <button
              onClick={() => setTab('raw')}
              className={`px-3 py-1 rounded-md transition-colors ${
                tab === 'raw'
                  ? 'bg-surface-elevated text-content-primary font-semibold shadow-xs'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              Raw Input
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-content-muted hover:text-content-primary transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs leading-relaxed text-content-primary whitespace-pre-wrap font-mono bg-surface/30">
          {contentToDisplay}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-subtle flex justify-end bg-surface/50">
          <button
            onClick={() => setActiveItem(null)}
            className="text-xs font-medium px-4 py-1.5 rounded-lg bg-surface border border-border-subtle hover:bg-surface-elevated text-content-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
