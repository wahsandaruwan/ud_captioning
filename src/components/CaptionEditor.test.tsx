import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CaptionEditor } from './CaptionEditor';
import { useEditorStore } from '../store/useEditorStore';

describe('CaptionEditor', () => {
  beforeEach(() => {
    useEditorStore.setState({
      captions: [],
      currentTime: 0,
    });
  });

  it('renders empty state correctly', () => {
    render(<CaptionEditor />);
    expect(screen.getByText('No captions yet.')).toBeInTheDocument();
  });

  it('renders a list of captions and allows text editing', () => {
    const mockCaptions = [
      { id: '1', start: 0, end: 5, text: 'Hello World', words: [] }
    ];
    useEditorStore.setState({ captions: mockCaptions });

    render(<CaptionEditor />);
    
    const textarea = screen.getByDisplayValue('Hello World') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'New Text' } });
    
    // Check if the store was updated
    expect(useEditorStore.getState().captions[0].text).toBe('New Text');
  });

  it('allows changing start and end times', () => {
    const mockCaptions = [
      { id: '1', start: 0, end: 5, text: 'Hello World', words: [] }
    ];
    useEditorStore.setState({ captions: mockCaptions });

    render(<CaptionEditor />);
    
    const startInput = screen.getByDisplayValue('0') as HTMLInputElement;
    const endInput = screen.getByDisplayValue('5') as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '1.5' } });
    fireEvent.change(endInput, { target: { value: '6' } });

    expect(useEditorStore.getState().captions[0].start).toBe(1.5);
    expect(useEditorStore.getState().captions[0].end).toBe(6);
  });

  it('selects caption when clicked', () => {
    const mockCaptions = [
      { id: '1', start: 2.5, end: 5, text: 'Hello World', words: [] }
    ];
    useEditorStore.setState({ captions: mockCaptions });

    render(<CaptionEditor />);
    
    // Click on the container (textarea is inside, we click the parent div)
    const textarea = screen.getByDisplayValue('Hello World');
    fireEvent.click(textarea.parentElement!);

    // Store should update current time to match caption's start
    expect(useEditorStore.getState().currentTime).toBe(2.5);
  });
});
