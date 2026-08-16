import { open } from '@tauri-apps/plugin-dialog';
import { useEditorStore } from '../store/useEditorStore';

export function BackgroundAudioSelector() {
  const { 
    backgroundAudio, 
    backgroundAudioVolume, 
    setBackgroundAudio, 
    setBackgroundAudioVolume 
  } = useEditorStore();

  const handleSelectAudio = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio',
          extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg']
        }]
      });

      if (selected && typeof selected === 'string') {
        setBackgroundAudio(selected);
      }
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
  };

  const handleRemoveAudio = () => {
    setBackgroundAudio(null);
  };

  // Get just the filename from the path
  const getFilename = (path: string) => {
    // Works for both Windows (\) and Unix (/) paths
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  return (
    <div className="w-full max-w-2xl bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4 mb-4">
      <h2 className="text-lg font-semibold mb-3">Background Audio</h2>
      
      {!backgroundAudio ? (
        <button 
          onClick={handleSelectAudio}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Select Audio File
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-100">
            <div className="flex items-center space-x-3 overflow-hidden">
              <span className="text-xl">🎵</span>
              <span className="font-medium truncate" title={backgroundAudio}>
                {getFilename(backgroundAudio)}
              </span>
            </div>
            <button 
              onClick={handleRemoveAudio}
              className="text-red-500 hover:text-red-700 p-1"
              title="Remove audio"
            >
              ✕
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <label htmlFor="volume-slider" className="text-sm font-medium text-gray-700 w-16">
              Volume:
            </label>
            <input 
              id="volume-slider"
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={backgroundAudioVolume}
              onChange={(e) => setBackgroundAudioVolume(parseFloat(e.target.value))}
              className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-500 w-12 text-right">
              {Math.round(backgroundAudioVolume * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
