import React from 'react';
import { KnowledgeItem } from '../../api/types';
import { useKnowledgeStore } from '../../store/useKnowledgeStore';
import { FileText, Globe, Trash2, Eye, ExternalLink, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  item: KnowledgeItem;
}

export const ItemCard: React.FC<Props> = ({ item }) => {
  const { deleteItem, retryItem, setActiveItem } = useKnowledgeStore();

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const renderStatusBadge = () => {
    switch (item.status) {
      case 'ready':
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready ({item.chunk_count} chunks)</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Indexing...</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span>Queued</span>
          </span>
        );
      case 'failed':
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveItem(item)}
              title={item.error_message || 'Indexing failed - click to view details'}
              className="inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Failed (View Error)</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                retryItem(item.id);
              }}
              title="Retry Ingestion"
              className="inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface border border-border-subtle hover:border-accent text-content-primary hover:text-accent transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Retry</span>
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="group bg-surface-elevated border border-border-subtle rounded-xl p-4 shadow-sm hover:border-accent/40 transition-all">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Type Icon & Info */}
        <div className="flex items-start space-x-3 min-w-0">
          <div className="mt-0.5 p-2 rounded-lg bg-surface border border-border-subtle text-content-muted flex-shrink-0">
            {item.type === 'note' ? (
              <FileText className="w-4 h-4 text-accent" />
            ) : (
              <Globe className="w-4 h-4 text-emerald-500" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-semibold text-content-primary truncate tracking-tight">
                {item.title || 'Untitled Note'}
              </h3>
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-content-muted hover:text-accent transition-colors flex-shrink-0"
                  title="Open source link in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="mt-1 flex items-center space-x-2 text-[11px] text-content-muted">
              <span>{formatDate(item.created_at)}</span>
              <span>&bull;</span>
              <span className="capitalize">{item.type}</span>
            </div>

            <div className="mt-2.5">
              {renderStatusBadge()}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setActiveItem(item)}
            title="Inspect Content"
            className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface border border-transparent hover:border-border-subtle transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${item.title}"?`)) {
                deleteItem(item.id);
              }
            }}
            title="Delete Item"
            className="p-1.5 rounded-lg text-content-muted hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
