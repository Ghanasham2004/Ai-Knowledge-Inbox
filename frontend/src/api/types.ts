export type ItemType = 'note' | 'url';
export type ItemStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface KnowledgeItem {
  id: string;
  type: ItemType;
  title: string;
  source_url?: string | null;
  raw_content?: string | null;
  cleaned_content?: string | null;
  chunk_count: number;
  status: ItemStatus;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestPayload {
  type: ItemType;
  title?: string;
  content?: string;
  url?: string;
}

export interface CitationItem {
  citation_id: number;
  item_id: string;
  title: string;
  source_type: string;
  source_url?: string | null;
  chunk_index: number;
  chunk_text: string;
  similarity_score: number;
}

export interface QueryResponse {
  success: boolean;
  query: string;
  answer: string;
  citations: CitationItem[];
  model: string;
  is_mock: boolean;
}

export interface HealthResponse {
  status: string;
  service: string;
  mock_mode: boolean;
  llm_model: string;
  total_items: number;
}
