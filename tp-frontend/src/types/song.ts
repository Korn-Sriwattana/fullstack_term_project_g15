export interface Song {
  id: string;
  youtubeVideoId: string;
  title: string;
  artist: string;
  coverUrl?: string;
  duration: number;
}

export interface QueueItem {
  id: string;
  queueIndex: number;
  source: string;
  song: Song;
}