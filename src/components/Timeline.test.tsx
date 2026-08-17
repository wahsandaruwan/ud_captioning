import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Timeline } from './Timeline';
import { useEditorStore } from '../store/useEditorStore';

describe('Timeline', () => {
  beforeEach(() => {
    useEditorStore.setState({
      captions: [],
      currentTime: 0,
      videoDuration: 10,
    });
  });

  it('renders correctly with given duration', () => {
    render(<Timeline />);
    expect(screen.getByText('00:10.00')).toBeInTheDocument();
  });

  it('renders caption blocks proportional to time', () => {
    const mockCaptions = [
      { id: '1', start: 0, end: 5, text: 'First half', words: [] },
      { id: '2', start: 5, end: 10, text: 'Second half', words: [] }
    ];
    useEditorStore.setState({ captions: mockCaptions });

    render(<Timeline />);
    
    const firstCaption = screen.getByText('First half');
    const secondCaption = screen.getByText('Second half');
    
    expect(firstCaption).toBeInTheDocument();
    expect(secondCaption).toBeInTheDocument();
    
    // Width should be 50% since duration is 10 and each block is 5
    expect(firstCaption.style.width).toBe('50%');
    expect(secondCaption.style.width).toBe('50%');
    expect(secondCaption.style.left).toBe('50%');
  });

  it('selects caption when block is clicked', () => {
    const mockCaptions = [
      { id: '1', start: 2.5, end: 5, text: 'Click me', words: [] }
    ];
    useEditorStore.setState({ captions: mockCaptions });

    render(<Timeline />);
    
    const captionBlock = screen.getByText('Click me');
    fireEvent.click(captionBlock);
    
    expect(useEditorStore.getState().currentTime).toBe(2.5);
  });

  it('updates currentTime on timeline mousedown', () => {
    render(<Timeline />);
    
    // Get the timeline container which is the sibling of the time text container
    const timeContainer = screen.getByText('00:10.00').parentElement;
    const timelineElement = timeContainer?.nextElementSibling as HTMLElement;
    
    timelineElement.getBoundingClientRect = () => ({
      left: 0,
      right: 100,
      top: 0,
      bottom: 20,
      width: 100,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    fireEvent.mouseDown(timelineElement, { clientX: 50 });
    
    // Since width is 100 and clientX is 50, percentage is 50%
    // Duration is 10, so currentTime should be 5
    expect(useEditorStore.getState().currentTime).toBe(5);
  });
});
