import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverlayPanel } from './OverlayPanel';
import { useEditorStore } from '../store/useEditorStore';

// Mock the open dialog since it's a Tauri API
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue('/mock/path/image.png')
}));

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-123'
  }
});

describe('OverlayPanel', () => {
  beforeEach(() => {
    useEditorStore.setState({
      overlays: [],
      videoDuration: 10,
    });
  });

  it('renders empty state correctly', () => {
    render(<OverlayPanel />);
    expect(screen.getByText('No overlays added yet.')).toBeInTheDocument();
  });

  it('adds a new text overlay with default values', () => {
    render(<OverlayPanel />);
    
    const addTextBtn = screen.getByTitle('Add Text');
    fireEvent.click(addTextBtn);
    
    // Check if the store was updated
    const state = useEditorStore.getState();
    expect(state.overlays).toHaveLength(1);
    expect(state.overlays[0].id).toBe('mock-uuid-123');
    expect(state.overlays[0].overlayType.type).toBe('text');
    // @ts-ignore
    expect(state.overlays[0].overlayType.text).toBe('New Text');
    expect(state.overlays[0].start).toBe(0);
    expect(state.overlays[0].end).toBe(10); // Extracted from videoDuration
    
    // Check if it's rendered
    expect(screen.getByDisplayValue('New Text')).toBeInTheDocument();
  });

  it('removes an overlay when delete button is clicked', () => {
    useEditorStore.setState({
      overlays: [{
        id: '1',
        overlayType: { type: 'text', text: 'To Be Deleted' },
        start: 0, end: 5, x: 0, y: 0, scale: 1, fontSize: 24, color: '#fff'
      }]
    });

    render(<OverlayPanel />);
    expect(screen.getByDisplayValue('To Be Deleted')).toBeInTheDocument();
    
    const deleteBtn = screen.getByTitle('Delete overlay');
    fireEvent.click(deleteBtn);
    
    expect(useEditorStore.getState().overlays).toHaveLength(0);
    expect(screen.queryByDisplayValue('To Be Deleted')).not.toBeInTheDocument();
  });

  it('updates text overlay values', () => {
    useEditorStore.setState({
      overlays: [{
        id: '1',
        overlayType: { type: 'text', text: 'Initial Text' },
        start: 0, end: 5, x: 0, y: 0, scale: 1, fontSize: 24, color: '#fff'
      }]
    });

    render(<OverlayPanel />);
    
    const textInput = screen.getByDisplayValue('Initial Text');
    fireEvent.change(textInput, { target: { value: 'Updated Text' } });
    
    // @ts-ignore
    expect(useEditorStore.getState().overlays[0].overlayType.text).toBe('Updated Text');
  });
});
