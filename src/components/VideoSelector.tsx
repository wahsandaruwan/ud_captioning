import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useAppStore } from '../store/useVideoStore';

export const VideoSelector: React.FC = () => {
  const { videoPath, setVideoPath } = useAppStore();

  const handleSelectVideo = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Video Files',
          extensions: ['mp4', 'mov', 'mkv', 'avi']
        }]
      });

      if (selected && typeof selected === 'string') {
        setVideoPath(selected);
      } else if (selected && Array.isArray(selected) && selected.length > 0) {
        setVideoPath(selected[0]);
      }
    } catch (err) {
      console.error('Failed to select video:', err);
    }
  };

  const videoUrl = videoPath ? convertFileSrc(videoPath) : null;

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <button 
        onClick={handleSelectVideo}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer font-medium"
      >
        Select Video
      </button>

      {videoUrl && (
        <div className="w-full max-w-4xl border rounded-lg shadow-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
          <video 
            src={videoUrl} 
            controls 
            className="w-full h-full object-contain"
            autoPlay
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
      
      {videoPath && (
        <p className="text-sm text-gray-400 break-all bg-gray-100 dark:bg-gray-800 p-2 rounded w-full max-w-4xl text-center">
          <strong>Path:</strong> {videoPath}
        </p>
      )}
    </div>
  );
};
