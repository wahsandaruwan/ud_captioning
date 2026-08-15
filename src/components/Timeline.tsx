import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

export const Timeline: React.FC = () => {
  const { captions, currentTime, setCurrentTime, videoDuration } = useEditorStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fallback to a minimum duration if the video duration isn't set yet.
  const duration = Math.max(videoDuration, 1);

  const handleSeek = (e: React.MouseEvent | React.TouchEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    let clientX = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    setCurrentTime(percentage * duration);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeek(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      setCurrentTime(percentage * duration);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration]); // React to changes

  return (
    <div className="flex flex-col w-full h-32 bg-gray-900 border-t border-gray-800 p-4">
      <div className="flex justify-between text-xs text-gray-400 mb-2 font-mono">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(videoDuration)}</span>
      </div>

      <div 
        className="relative w-full flex-1 bg-gray-800 rounded-md cursor-pointer overflow-hidden border border-gray-700"
        ref={timelineRef}
        onMouseDown={handleMouseDown}
      >
        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
          <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full"></div>
        </div>

        {/* Captions Tracks */}
        <div className="absolute top-4 bottom-0 left-0 right-0 py-1">
          {captions.map((caption) => {
            const startPercent = (caption.start / duration) * 100;
            const widthPercent = ((caption.end - caption.start) / duration) * 100;
            const isSelected = currentTime >= caption.start && currentTime <= caption.end;

            return (
              <div
                key={caption.id}
                className={`absolute h-8 rounded-sm text-[10px] overflow-hidden whitespace-nowrap px-1 leading-8 transition-colors ${
                  isSelected ? 'bg-blue-600 border border-blue-400 z-10 text-white' : 'bg-blue-900/60 border border-blue-800/50 text-blue-200'
                }`}
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentTime(caption.start);
                }}
                title={caption.text}
              >
                {caption.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
