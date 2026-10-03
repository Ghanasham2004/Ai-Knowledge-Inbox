import { create } from 'zustand';
import { KnowledgeItem, IngestPayload, QueryResponse, HealthResponse } from '../api/types';
import { apiClient } from '../api/client';

interface KnowledgeStore {
  items: KnowledgeItem[];
  isLoadingItems: boolean;
  isIngesting: boolean;
  ingestError: string | null;
  activeItem: KnowledgeItem | null;
  queryResult: QueryResponse | null;
  recentQueries: string[];
  isQuerying: boolean;
  queryError: string | null;
  selectedCitationId: number | null;
  theme: 'light' | 'dark';
  systemHealth: HealthResponse | null;

  // Actions
  init: () => Promise<void>;
  fetchItems: () => Promise<void>;
  ingestItem: (payload: IngestPayload) => Promise<boolean>;
  deleteItem: (id: string) => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  askQuestion: (query: string) => Promise<void>;
  removeRecentQuery: (query: string) => void;
  setActiveItem: (item: KnowledgeItem | null) => void;
  setSelectedCitationId: (id: number | null) => void;
  toggleTheme: () => void;
  clearQuery: () => void;
}

let isInitialized = false;

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  items: [],
  isLoadingItems: false,
  isIngesting: false,
  ingestError: null,
  activeItem: null,
  queryResult: (() => {
    try {
      const saved = localStorage.getItem('last_query_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  recentQueries: (() => {
    try {
      const saved = localStorage.getItem('recent_queries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  isQuerying: false,
  queryError: null,
  selectedCitationId: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  systemHealth: null,

  init: async () => {
    // Apply theme
    const theme = get().theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (isInitialized) return;
    isInitialized = true;

    try {
      const health = await apiClient.getHealth();
      set({ systemHealth: health });
    } catch {
      // Backend may be starting
    }

    await get().fetchItems();
  },

  fetchItems: async () => {
    set({ isLoadingItems: true });
    try {
      const { items } = await apiClient.getItems();
      set({ items, isLoadingItems: false });

      // If any items are processing or pending, schedule a poll in 2 seconds
      const hasPending = items.some((it) => it.status === 'pending' || it.status === 'processing');
      if (hasPending) {
        setTimeout(() => {
          get().fetchItems();
        }, 2000);
      }
    } catch (err: any) {
      set({ isLoadingItems: false });
    }
  },

  ingestItem: async (payload: IngestPayload) => {
    set({ isIngesting: true, ingestError: null });
    try {
      const newItem = await apiClient.ingestContent(payload);
      set((state) => ({
        items: [newItem, ...state.items],
        isIngesting: false,
      }));

      // Start polling for this item's processing completion
      setTimeout(() => {
        get().fetchItems();
      }, 1500);

      return true;
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to ingest item';
      set({ isIngesting: false, ingestError: message });
      return false;
    }
  },

  deleteItem: async (id: string) => {
    try {
      await apiClient.deleteItem(id);
      set((state) => ({
        items: state.items.filter((it) => it.id !== id),
        activeItem: state.activeItem?.id === id ? null : state.activeItem,
      }));
    } catch (err: any) {
      console.error('Delete item failed:', err);
    }
  },

  retryItem: async (id: string) => {
    try {
      await apiClient.retryItem(id);
      set((state) => ({
        items: state.items.map((it) =>
          it.id === id ? { ...it, status: 'pending' as const, error_message: null } : it
        ),
        activeItem:
          state.activeItem?.id === id
            ? { ...state.activeItem, status: 'pending' as const, error_message: null }
            : state.activeItem,
      }));
      setTimeout(() => {
        get().fetchItems();
      }, 1500);
    } catch (err: any) {
      console.error('Retry item failed:', err);
    }
  },

  askQuestion: async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    set({ isQuerying: true, queryError: null, selectedCitationId: null });
    try {
      const response = await apiClient.queryKnowledge(trimmed);
      set({ queryResult: response, isQuerying: false });

      // Persist latest answer & query history
      try {
        localStorage.setItem('last_query_result', JSON.stringify(response));
        const updatedRecents = [trimmed, ...get().recentQueries.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
        localStorage.setItem('recent_queries', JSON.stringify(updatedRecents));
        set({ recentQueries: updatedRecents });
      } catch (e) {}
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Query failed';
      set({ isQuerying: false, queryError: message });
    }
  },

  removeRecentQuery: (q: string) => {
    const updated = get().recentQueries.filter((item) => item !== q);
    try {
      localStorage.setItem('recent_queries', JSON.stringify(updated));
    } catch (e) {}
    set({ recentQueries: updated });
  },

  setActiveItem: (item) => set({ activeItem: item }),
  setSelectedCitationId: (id) => set({ selectedCitationId: id }),
  clearQuery: () => {
    try {
      localStorage.removeItem('last_query_result');
    } catch (e) {}
    set({ queryResult: null, queryError: null, selectedCitationId: null });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: nextTheme });
  },
}));
