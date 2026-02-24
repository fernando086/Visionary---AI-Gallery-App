
export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'gif';
  name: string;
  timestamp: number;
  metadata?: MediaMetadata;
}

export interface MediaMetadata {
  description: string;
  tags: string[];
  dominantColors: string[];
  objects: string[];
  mood: string;
}

export interface SearchResult {
  itemId: string;
  relevanceScore: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  SEARCHING = 'SEARCHING',
  INDEXING = 'INDEXING'
}

export interface Album {
  id: string; // identifier for mobile, name/path for web
  name: string;
  count: number;
  thumbnailUrl?: string;
  thumbnailType?: 'image' | 'video';
}
