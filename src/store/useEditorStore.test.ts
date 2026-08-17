import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './useEditorStore';

describe('useEditorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useEditorStore.setState({
      captions: [],
      overlays: [],
      backgroundAudio: null,
      currentTime: 0,
    });
  });

  it('should set captions', () => {
    const { setCaptions } = useEditorStore.getState();
    const mockCaptions = [
      { id: '1', start: 0, end: 1, text: 'Hello', words: [] }
    ];
    
    setCaptions(mockCaptions);
    expect(useEditorStore.getState().captions).toEqual(mockCaptions);
  });

  it('should update an existing caption', () => {
    const { setCaptions, updateCaption } = useEditorStore.getState();
    setCaptions([{ id: '1', start: 0, end: 1, text: 'Hello', words: [] }]);
    
    updateCaption('1', { text: 'World' });
    expect(useEditorStore.getState().captions[0].text).toBe('World');
  });

  it('should add and remove an overlay', () => {
    const { addOverlay, removeOverlay } = useEditorStore.getState();
    
    const mockOverlay = {
      id: 'o1',
      overlayType: { type: 'text' as const, text: 'Overlay' },
      start: 0,
      end: 5,
      x: 10,
      y: 10,
      scale: 1,
      fontSize: 24,
      color: '#fff'
    };
    
    addOverlay(mockOverlay);
    expect(useEditorStore.getState().overlays).toHaveLength(1);
    expect(useEditorStore.getState().overlays[0].id).toBe('o1');
    
    removeOverlay('o1');
    expect(useEditorStore.getState().overlays).toHaveLength(0);
  });

  it('should set background audio', () => {
    const { setBackgroundAudio } = useEditorStore.getState();
    
    setBackgroundAudio('/path/to/audio.mp3');
    expect(useEditorStore.getState().backgroundAudio).toBe('/path/to/audio.mp3');
    
    setBackgroundAudio(null);
    expect(useEditorStore.getState().backgroundAudio).toBeNull();
  });
});
