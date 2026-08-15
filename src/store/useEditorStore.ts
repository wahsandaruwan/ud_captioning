import { create } from 'zustand';

export interface Word {
  word: string;
  start: number;
  end: number;
  importance: number;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
}

export type OverlayType = 
  | { type: 'text'; text: string }
  | { type: 'image'; path: string }
  | { type: 'emoji'; emoji: string };

export interface OverlayItem {
  id: string;
  overlayType: OverlayType;
  start: number;
  end: number;
  x: number;
  y: number;
  scale: number;
  fontSize: number;
  color: string;
}

interface EditorState {
  videoPath: string | null;
  captions: CaptionSegment[];
  overlays: OverlayItem[];
  backgroundAudio: string | null;
  backgroundAudioVolume: number;
  currentTime: number; // useful for seeking and timeline
  
  // Actions
  setVideoPath: (path: string | null) => void;
  setCaptions: (captions: CaptionSegment[]) => void;
  addCaption: (caption: CaptionSegment) => void;
  updateCaption: (id: string, updates: Partial<CaptionSegment>) => void;
  removeCaption: (id: string) => void;
  
  addOverlay: (overlay: OverlayItem) => void;
  updateOverlay: (id: string, updates: Partial<OverlayItem>) => void;
  removeOverlay: (id: string) => void;
  
  setBackgroundAudio: (path: string | null) => void;
  setBackgroundAudioVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  videoDuration: number;
  setVideoDuration: (duration: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  videoPath: null,
  captions: [],
  overlays: [],
  backgroundAudio: null,
  backgroundAudioVolume: 1.0,
  currentTime: 0,
  videoDuration: 0,
  
  setVideoPath: (path) => set({ videoPath: path }),
  
  setCaptions: (captions) => set({ captions }),
  addCaption: (caption) => set((state) => ({ captions: [...state.captions, caption] })),
  updateCaption: (id, updates) => set((state) => ({
    captions: state.captions.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  removeCaption: (id) => set((state) => ({
    captions: state.captions.filter((c) => c.id !== id)
  })),
  
  addOverlay: (overlay) => set((state) => ({ overlays: [...state.overlays, overlay] })),
  updateOverlay: (id, updates) => set((state) => ({
    overlays: state.overlays.map((o) => o.id === id ? { ...o, ...updates } : o)
  })),
  removeOverlay: (id) => set((state) => ({
    overlays: state.overlays.filter((o) => o.id !== id)
  })),
  
  setBackgroundAudio: (path) => set({ backgroundAudio: path }),
  setBackgroundAudioVolume: (volume) => set({ backgroundAudioVolume: volume }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVideoDuration: (duration) => set({ videoDuration: duration }),
}));
