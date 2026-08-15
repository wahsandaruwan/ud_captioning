import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useEditorStore, OverlayItem as StoreOverlayItem, OverlayType } from '../store/useEditorStore';

const OverlayItemEditor: React.FC<{
  item: StoreOverlayItem;
  updateOverlay: (id: string, updates: Partial<StoreOverlayItem>) => void;
  removeOverlay: (id: string) => void;
}> = ({ item, updateOverlay, removeOverlay }) => {
  
  const handleUpdate = (field: keyof StoreOverlayItem, value: any) => {
    updateOverlay(item.id, { [field]: value });
  };

  const handleTypeUpdate = (updates: Partial<OverlayType>) => {
    updateOverlay(item.id, { overlayType: { ...item.overlayType, ...updates } as OverlayType });
  };

  const selectImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Image',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
        }]
      });
      if (selected && typeof selected === 'string') {
        handleTypeUpdate({ type: 'image', path: selected } as OverlayType);
      }
    } catch (err) {
      console.error("Failed to pick image:", err);
    }
  };

  return (
    <div className="bg-gray-800/80 p-3 rounded-md border border-gray-700 space-y-2 mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold capitalize text-gray-200">
          {item.overlayType.type} Overlay
        </span>
        <button
          onClick={() => removeOverlay(item.id)}
          className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-red-900/30 transition-colors"
          title="Delete overlay"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      {/* Content Editor */}
      {item.overlayType.type === 'text' && (
        <input
          type="text"
          value={item.overlayType.text}
          onChange={(e) => handleTypeUpdate({ text: e.target.value } as OverlayType)}
          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Enter text..."
        />
      )}

      {item.overlayType.type === 'emoji' && (
        <input
          type="text"
          value={item.overlayType.emoji}
          onChange={(e) => handleTypeUpdate({ emoji: e.target.value } as OverlayType)}
          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Enter emoji..."
        />
      )}

      {item.overlayType.type === 'image' && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            readOnly
            value={item.overlayType.path}
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 cursor-not-allowed"
            placeholder="No image selected"
          />
          <button
            onClick={selectImage}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
          >
            Browse
          </button>
        </div>
      )}

      {/* Timing and Styling Controls */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Start (s)</label>
          <input
            type="number" step="0.1" min="0"
            value={item.start}
            onChange={(e) => handleUpdate('start', parseFloat(e.target.value) || 0)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">End (s)</label>
          <input
            type="number" step="0.1" min="0"
            value={item.end}
            onChange={(e) => handleUpdate('end', parseFloat(e.target.value) || 0)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">X Pos (0-1)</label>
          <input
            type="number" step="0.05" min="0" max="1"
            value={item.x}
            onChange={(e) => handleUpdate('x', parseFloat(e.target.value) || 0)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Y Pos (0-1)</label>
          <input
            type="number" step="0.05" min="0" max="1"
            value={item.y}
            onChange={(e) => handleUpdate('y', parseFloat(e.target.value) || 0)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        {item.overlayType.type === 'text' && (
          <>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Font Size</label>
              <input
                type="number" step="1" min="1"
                value={item.fontSize}
                onChange={(e) => handleUpdate('fontSize', parseFloat(e.target.value) || 16)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Color</label>
              <input
                type="color"
                value={item.color}
                onChange={(e) => handleUpdate('color', e.target.value)}
                className="w-full h-6 bg-gray-900 border border-gray-700 rounded p-0 cursor-pointer"
              />
            </div>
          </>
        )}

        {item.overlayType.type === 'emoji' && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Font Size</label>
            <input
              type="number" step="1" min="1"
              value={item.fontSize}
              onChange={(e) => handleUpdate('fontSize', parseFloat(e.target.value) || 16)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {item.overlayType.type === 'image' && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Scale</label>
            <input
              type="number" step="0.1" min="0.1"
              value={item.scale}
              onChange={(e) => handleUpdate('scale', parseFloat(e.target.value) || 1)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const OverlayPanel: React.FC = () => {
  const { overlays, addOverlay, updateOverlay, removeOverlay, videoDuration } = useEditorStore();

  const handleAddOverlay = (type: 'text' | 'image' | 'emoji') => {
    const newId = crypto.randomUUID();
    const newOverlay: StoreOverlayItem = {
      id: newId,
      overlayType: type === 'text' 
        ? { type: 'text', text: 'New Text' } 
        : type === 'image' 
          ? { type: 'image', path: '' } 
          : { type: 'emoji', emoji: '😀' },
      start: 0,
      end: Math.max(videoDuration || 5, 5),
      x: 0.5,
      y: 0.5,
      scale: 1,
      fontSize: 24,
      color: '#ffffff'
    };
    addOverlay(newOverlay);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden border border-gray-800">
      <div className="p-4 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-wide text-gray-100">Overlays</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => handleAddOverlay('text')}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
            title="Add Text"
          >
            + Text
          </button>
          <button 
            onClick={() => handleAddOverlay('image')}
            className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium transition-colors"
            title="Add Image"
          >
            + Image
          </button>
          <button 
            onClick={() => handleAddOverlay('emoji')}
            className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 rounded text-white font-medium transition-colors"
            title="Add Emoji"
          >
            + Emoji
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {overlays.length === 0 ? (
          <div className="text-gray-500 text-center py-8 text-sm italic">
            No overlays added yet.
          </div>
        ) : (
          overlays.map((item) => (
            <OverlayItemEditor
              key={item.id}
              item={item}
              updateOverlay={updateOverlay}
              removeOverlay={removeOverlay}
            />
          ))
        )}
      </div>
    </div>
  );
};
