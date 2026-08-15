import React from 'react';
import { useEditorStore } from '../store/useEditorStore';

export const CaptionEditor: React.FC = () => {
  const { captions, updateCaption, removeCaption, currentTime, setCurrentTime } = useEditorStore();

  const handleTimeChange = (id: string, field: 'start' | 'end', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateCaption(id, { [field]: numValue });
    }
  };

  const handleTextChange = (id: string, text: string) => {
    updateCaption(id, { text });
  };

  const handleDelete = (id: string) => {
    removeCaption(id);
  };

  const handleSelectCaption = (start: number) => {
    setCurrentTime(start);
    // The parent component should seek the video to `start`
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-950">
        <h2 className="text-lg font-semibold tracking-wide text-gray-100">Captions</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {captions.length === 0 ? (
          <div className="text-gray-500 text-center py-8 text-sm italic">
            No captions yet.
          </div>
        ) : (
          captions.map((caption) => {
            const isSelected = currentTime >= caption.start && currentTime <= caption.end;
            
            return (
              <div
                key={caption.id}
                onClick={() => handleSelectCaption(caption.start)}
                className={`p-3 rounded-md border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-900/40 border-blue-500'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-500 hover:bg-gray-800'
                }`}
              >
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={caption.start}
                    onChange={(e) => handleTimeChange(caption.id, 'start', e.target.value)}
                    className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={caption.end}
                    onChange={(e) => handleTimeChange(caption.id, 'end', e.target.value)}
                    className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(caption.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                    title="Delete caption"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                
                <textarea
                  value={caption.text}
                  onChange={(e) => handleTextChange(caption.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-blue-500 rounded p-2 text-sm text-gray-200 resize-none focus:outline-none focus:bg-gray-900 transition-all"
                  rows={2}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
