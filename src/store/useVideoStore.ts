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

interface AppState {
  videoPath: string | null;
  setVideoPath: (path: string | null) => void;
  
  googleKeyPath: string | null;
  setGoogleKeyPath: (path: string | null) => void;
  
  languageCode: string;
  setLanguageCode: (code: string) => void;
  
  captions: CaptionSegment[];
  setCaptions: (captions: CaptionSegment[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  videoPath: null,
  setVideoPath: (path) => set({ videoPath: path }),
  
  googleKeyPath: null,
  setGoogleKeyPath: (path) => set({ googleKeyPath: path }),
  
  languageCode: 'en-US',
  setLanguageCode: (code) => set({ languageCode: code }),
  
  captions: [],
  setCaptions: (captions) => set({ captions }),
}));

