import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Store } from '@tauri-apps/plugin-store';
import { useAppStore, CaptionSegment } from '../store/useVideoStore';

export const TranscriptionPanel: React.FC = () => {
  const { 
    videoPath, 
    googleKeyPath, setGoogleKeyPath,
    languageCode, setLanguageCode,
    captions, setCaptions
  } = useAppStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Load key path from store on mount
  useEffect(() => {
    async function loadStore() {
      try {
        const store = new Store('store.json');
        const key = await store.get<string>('google_key_path');
        if (key) {
          setGoogleKeyPath(key);
        }
      } catch (err) {
        console.error("Failed to load store:", err);
      }
    }
    loadStore();
  }, [setGoogleKeyPath]);

  // Listen to backend progress
  useEffect(() => {
    const unlisten = listen<{message: string, percent: number}>('transcription-progress', (event) => {
      setProgressText(event.payload.message);
      setProgressPercent(event.payload.percent);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const handleSelectKey = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });

      if (selected && typeof selected === 'string') {
        const store = new Store('store.json');
        await store.set('google_key_path', selected);
        await store.save();
        setGoogleKeyPath(selected);
      }
    } catch (err) {
      console.error('Failed to select key:', err);
    }
  };

  const handleTranscribe = async () => {
    if (!videoPath) return;
    
    setIsProcessing(true);
    setProgressPercent(0);
    setCaptions([]);

    try {
      setProgressText('Extracting audio from video...');
      
      const wavPath = await invoke<string>('extract_audio', { 
        videoPath 
      });

      setProgressText('Audio extracted. Starting transcription...');
      
      const segments = await invoke<CaptionSegment[]>('transcribe_audio', {
        wavPath,
        languageCode
      });

      setCaptions(segments);
      setProgressText('Transcription complete!');
      setProgressPercent(100);
      
    } catch (error) {
      console.error('Process failed:', error);
      setProgressText(`Error: ${error}`);
      setProgressPercent(0);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Transcription Settings</h2>
      
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSelectKey}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded transition-colors text-sm font-medium"
          >
            Select Google Key
          </button>
          <span className="text-sm text-gray-500 truncate flex-1">
            {googleKeyPath ? googleKeyPath : 'No key selected. Transcription will fail.'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Language:
          </label>
          <select 
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
            className="p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
          >
            <option value="en-US">English (US)</option>
            <option value="si-LK">Sinhala (LK)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleTranscribe}
        disabled={!videoPath || !googleKeyPath || isProcessing}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
      >
        {isProcessing ? 'Processing...' : 'Extract & Transcribe'}
      </button>

      {(isProcessing || progressPercent > 0) && (
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-1 text-gray-600 dark:text-gray-400">
            <span>{progressText}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {captions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Transcribed Captions</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {captions.map((cap, idx) => (
              <div key={cap.id || idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-purple-600 dark:text-purple-400 font-mono mb-1">
                  [{cap.start.toFixed(2)}s - {cap.end.toFixed(2)}s]
                </div>
                <div className="text-gray-800 dark:text-gray-200 text-sm">
                  {cap.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
