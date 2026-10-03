import axios from 'axios';
import { IngestPayload, KnowledgeItem, QueryResponse, HealthResponse } from './types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const apiClient = {
  async getHealth(): Promise<HealthResponse> {
    const { data } = await api.get<HealthResponse>('/health');
    return data;
  },

  async getItems(limit = 50, offset = 0): Promise<{ items: KnowledgeItem[]; total: number }> {
    const { data } = await api.get<{ success: boolean; total: number; items: KnowledgeItem[] }>('/items', {
      params: { limit, offset },
    });
    return { items: data.items, total: data.total };
  },

  async getItem(id: string): Promise<KnowledgeItem> {
    const { data } = await api.get<KnowledgeItem>(`/items/${id}`);
    return data;
  },

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  },

  async retryItem(id: string): Promise<void> {
    await api.post(`/items/${id}/retry`);
  },

  async ingestContent(payload: IngestPayload): Promise<KnowledgeItem> {
    const { data } = await api.post<{ success: boolean; data: KnowledgeItem; message: string }>('/ingest', payload);
    return data.data;
  },

  async queryKnowledge(query: string, top_k = 4): Promise<QueryResponse> {
    const { data } = await api.post<QueryResponse>('/query', { query, top_k });
    return data;
  },
};
