import React, { useState } from 'react';
import { useKnowledgeStore } from '../../store/useKnowledgeStore';
import { ItemCard } from './ItemCard';
import { ItemType } from '../../api/types';
import { Search, Inbox, Filter } from 'lucide-react';

export const ItemList: React.FC = () => {
  const { items } = useKnowledgeStore();
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.source_url && item.source_url.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-3.5">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved items..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-content-primary placeholder-content-muted/50 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3 h-3 text-content-muted mr-1 hidden sm:block" />
          {(['all', 'note', 'url'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize transition-colors ${
                filterType === t
                  ? 'bg-content-primary text-surface font-semibold'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface border border-border-subtle'
              }`}
            >
              {t === 'all' ? `All (${items.length})` : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length > 0 ? (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border-subtle rounded-xl p-8 text-center bg-surface/50">
          <div className="w-10 h-10 mx-auto rounded-full bg-surface border border-border-subtle flex items-center justify-center text-content-muted mb-2.5">
            <Inbox className="w-5 h-5 opacity-60" />
          </div>
          <h4 className="text-xs font-semibold text-content-primary">
            {searchQuery || filterType !== 'all' ? 'No items match your filter' : 'Your knowledge inbox is empty'}
          </h4>
          <p className="mt-1 text-[11px] text-content-muted max-w-xs mx-auto">
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search query or switching filters.'
              : 'Add a plain text note or paste a web article URL above to begin indexing.'}
          </p>
        </div>
      )}
    </div>
  );
};
