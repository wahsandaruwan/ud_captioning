import { create } from 'zustand';

interface VideoState {
  videoPath: string | null;
  setVideoPath: (path: string | null) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videoPath: null,
  setVideoPath: (path) => set({ videoPath: path }),
}));
