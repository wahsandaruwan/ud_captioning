import React from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useEditorStore } from '../store/useEditorStore';

interface VideoOverlayRendererProps {
  // If the video container aspect ratio differs from the video itself, 
  // you might need to pass down dimensions, but typically `absolute inset-0` 
  // over the video player wrapper handles the responsive nature correctly.
}

export const VideoOverlayRenderer: React.FC<VideoOverlayRendererProps> = () => {
  const { overlays, currentTime } = useEditorStore();

  // Filter overlays that should be visible at the current time
  const visibleOverlays = overlays.filter(
    (overlay) => currentTime >= overlay.start && currentTime <= overlay.end
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {visibleOverlays.map((overlay) => {
        // x and y are normalized coordinates (0.0 to 1.0)
        // 0,0 is top left, 1,1 is bottom right
        const leftPercent = overlay.x * 100;
        const topPercent = overlay.y * 100;

        // Base styles common to all overlays
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${leftPercent}%`,
          top: `${topPercent}%`,
          // Center the element precisely at the x, y point
          transform: `translate(-50%, -50%) scale(${overlay.scale})`,
          fontSize: `${overlay.fontSize}px`,
          color: overlay.color,
          pointerEvents: 'none', // Prevents blocking video controls
          whiteSpace: 'pre-wrap',
          textAlign: 'center',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)', // Makes text readable over video
        };

        if (overlay.overlayType.type === 'text') {
          return (
            <div key={overlay.id} style={style}>
              {overlay.overlayType.text}
            </div>
          );
        }

        if (overlay.overlayType.type === 'emoji') {
          return (
            <div key={overlay.id} style={style}>
              {overlay.overlayType.emoji}
            </div>
          );
        }

        if (overlay.overlayType.type === 'image') {
          // Tauri requires using convertFileSrc to load local files into the webview
          const imageSrc = overlay.overlayType.path ? convertFileSrc(overlay.overlayType.path) : '';
          
          return (
            <img 
              key={overlay.id} 
              src={imageSrc} 
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: `translate(-50%, -50%) scale(${overlay.scale})`,
                pointerEvents: 'none',
              }}
              alt="overlay" 
            />
          );
        }

        return null;
      })}
    </div>
  );
};
