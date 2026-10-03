import React from 'react';
import { CitationItem } from '../../api/types';
import { useKnowledgeStore } from '../../store/useKnowledgeStore';
import { ExternalLink } from 'lucide-react';

interface Props {
  citation: CitationItem;
}

export const CitationCard: React.FC<Props> = ({ citation }) => {
  const { selectedCitationId, setSelectedCitationId } = useKnowledgeStore();
  const isSelected = selectedCitationId === citation.citation_id;

  const matchPercent = Math.round(citation.similarity_score * 100);

  return (
    <div
      id={`citation-${citation.citation_id}`}
      onClick={() => setSelectedCitationId(isSelected ? null : citation.citation_id)}
      className={`cursor-pointer rounded-xl p-3.5 border transition-all ${
        isSelected
          ? 'bg-accent/5 border-accent ring-1 ring-accent/30 shadow-sm'
          : 'bg-surface-elevated border-border-subtle hover:border-accent/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-white">
            [{citation.citation_id}]
          </span>

          <span className="text-xs font-semibold text-content-primary truncate">
            {citation.title}
          </span>

          {citation.source_url && (
            <a
              href={citation.source_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-content-muted hover:text-accent flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Similarity Score */}
        <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-content-muted">
          {matchPercent}% match
        </span>
      </div>

      {/* Snippet Text */}
      <p className="text-xs text-content-muted leading-relaxed line-clamp-3 font-sans italic bg-surface/40 p-2 rounded-lg border border-border-subtle/50">
        "{citation.chunk_text}"
      </p>

      <div className="mt-2 flex items-center justify-between text-[10px] text-content-muted">
        <span className="capitalize">{citation.source_type} &bull; Chunk #{citation.chunk_index + 1}</span>
        <span className="text-accent hover:underline">
          {isSelected ? 'Click to deselect' : 'Click to inspect snippet'}
        </span>
      </div>
    </div>
  );
};
