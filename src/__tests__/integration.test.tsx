import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Assuming you create a top-level App wrapper for your tests
// import App from '../App';
import { TranscriptionPanel } from '../components/TranscriptionPanel';
import { useAppStore } from '../store/useVideoStore';
import { useEditorStore } from '../store/useEditorStore';

// --- Tauri Mocks ---
// 1. Mock the Tauri core invoke command
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd, args) => {
    switch (cmd) {
      case 'extract_audio':
        return Promise.resolve('/tmp/mock_audio.wav');
      case 'transcribe_audio':
        return Promise.resolve([
          { id: '1', start: 0, end: 2, text: 'Hello integration test', words: [] }
        ]);
      case 'extract_important_words':
        return Promise.resolve([
          { 
            id: '1', start: 0, end: 2, text: 'Hello integration test', 
            words: [{ word: 'integration', start: 0.5, end: 1, importance: 0.9 }] 
          }
        ]);
      case 'export_video':
        return Promise.resolve('/path/to/final/exported_video.mp4');
      default:
        return Promise.reject(new Error(`Unknown command: ${cmd}`));
    }
  })
}));

// 2. Mock Tauri event listener
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}) // mock unlisten fn
}));

// 3. Mock file dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue('/mock/selected/file.mp4')
}));

// 4. Mock Store plugin
vi.mock('@tauri-apps/plugin-store', () => {
  return {
    Store: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue('/mock/google/key.json'),
      set: vi.fn().mockResolvedValue(true),
      save: vi.fn().mockResolvedValue(true)
    }))
  };
});


describe('Full Workflow Integration Test', () => {
  beforeEach(() => {
    // Reset stores
    useAppStore.setState({ videoPath: '/mock/selected/file.mp4', googleKeyPath: '/mock/google/key.json', captions: [] });
    useEditorStore.setState({ captions: [], overlays: [], videoPath: '/mock/selected/file.mp4' });
    vi.clearAllMocks();
  });

  it('executes the full extraction and transcription pipeline', async () => {
    const { invoke } = await import('@tauri-apps/api/core');

    render(<TranscriptionPanel />);
    
    // Step 1 & 2 & 3: User triggers transcription (which internally calls extract_audio and transcribe_audio)
    const transcribeBtn = screen.getByText('Extract & Transcribe');
    fireEvent.click(transcribeBtn);
    
    // Check loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument();

    // Wait for the pipeline to finish and render captions
    await waitFor(() => {
      expect(screen.getByText('Hello integration test')).toBeInTheDocument();
    });

    // Assert that the Tauri sidecar commands were called properly
    expect(invoke).toHaveBeenCalledWith('extract_audio', { videoPath: '/mock/selected/file.mp4' });
    expect(invoke).toHaveBeenCalledWith('transcribe_audio', { wavPath: '/tmp/mock_audio.wav', languageCode: 'en-US' });
    
    // Store should contain the mocked response
    expect(useAppStore.getState().captions.length).toBe(1);
    
    // --- Step 4 & 5: Mock user adding an overlay in the editor store ---
    useEditorStore.getState().addOverlay({
      id: 'mock-overlay',
      overlayType: { type: 'text', text: 'Subscribe!' },
      start: 0, end: 5, x: 0.5, y: 0.5, scale: 1, fontSize: 32, color: '#ff0000'
    });
    expect(useEditorStore.getState().overlays).toHaveLength(1);

    // --- Step 6: Trigger export ---
    // In a real e2e test, we'd render the Export component and click "Export". 
    // Here we simulate the component invoking the Tauri command:
    const exportResult = await invoke('export_video', {
      config: {
        video_path: '/mock/selected/file.mp4',
        captions: useAppStore.getState().captions,
        overlays: useEditorStore.getState().overlays,
        quality: 'high'
      }
    });

    expect(invoke).toHaveBeenCalledWith('export_video', expect.any(Object));
    expect(exportResult).toBe('/path/to/final/exported_video.mp4');
  });
});
