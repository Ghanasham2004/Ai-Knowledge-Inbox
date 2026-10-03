import React, { useState } from 'react';
import { useKnowledgeStore } from '../../store/useKnowledgeStore';
import { ItemType } from '../../api/types';
import { FileText, Globe, Plus, Loader2, AlertCircle } from 'lucide-react';

export const IngestForm: React.FC = () => {
  const { ingestItem, isIngesting, ingestError } = useKnowledgeStore();
  const [type, setType] = useState<ItemType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (type === 'note' && !content.trim()) {
      setValidationError('Please enter some text content for your note.');
      return;
    }

    if (type === 'url') {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setValidationError('Please enter a web URL.');
        return;
      }
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        setValidationError('URL must start with http:// or https://');
        return;
      }
    }

    const success = await ingestItem({
      type,
      title: title.trim() || undefined,
      content: type === 'note' ? content.trim() : undefined,
      url: type === 'url' ? url.trim() : undefined,
    });

    if (success) {
      setTitle('');
      setContent('');
      setUrl('');
    }
  };

  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-xl p-5 shadow-sm transition-colors">
      {/* Type Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-border-subtle pb-3 mb-4">
        <button
          type="button"
          onClick={() => { setType('note'); setValidationError(null); }}
          className={`flex items-center space-x-2 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
            type === 'note'
              ? 'bg-accent text-white shadow-sm shadow-accent/20'
              : 'text-content-muted hover:text-content-primary hover:bg-surface'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Text Note</span>
        </button>

        <button
          type="button"
          onClick={() => { setType('url'); setValidationError(null); }}
          className={`flex items-center space-x-2 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
            type === 'url'
              ? 'bg-accent text-white shadow-sm shadow-accent/20'
              : 'text-content-muted hover:text-content-primary hover:bg-surface'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Web URL</span>
        </button>
      </div>

      {/* Error Notices */}
      {(validationError || ingestError) && (
        <div className="mb-4 flex items-start space-x-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{validationError || ingestError}</span>
        </div>
      )}

      {/* Ingestion Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">
            Title <span className="text-content-muted/60">(Optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'note' ? 'e.g. SQLite Concurrency Notes' : 'e.g. System Design Article'}
            className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border-subtle text-content-primary placeholder-content-muted/50 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {type === 'note' ? (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-content-muted">
                Note Content <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-content-muted">
                {content.length} chars
              </span>
            </div>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write thoughts, meeting notes, code snippets, or quotes..."
              className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border-subtle text-content-primary placeholder-content-muted/50 focus:outline-none focus:ring-1 focus:ring-accent transition-colors resize-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-content-muted mb-1">
              Web URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://fly.io/blog/all-in-on-sqlite/"
              className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border-subtle text-content-primary placeholder-content-muted/50 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
            <p className="mt-1 text-[11px] text-content-muted">
              Server asynchronously fetches the page, cleans ads/scripts, and indexes chunks.
            </p>
          </div>
        )}

        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={isIngesting}
            className="flex items-center space-x-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-all shadow-sm shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isIngesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Queuing...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Save to Inbox</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
