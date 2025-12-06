/**
 * PDFViewer - Main PDF Display Component
 */

import React, { useState, useCallback } from 'react';
import type { TextBlock } from '@core/types';
import './PDFViewer.css';

interface PDFViewerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  textBlocks: TextBlock[];
  selectedBlock: TextBlock | null;
  onTextClick: (block: TextBlock, event: React.MouseEvent) => void;
  onCanvasClick: (x: number, y: number, event: React.MouseEvent) => void;
  isEditing: boolean;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  containerRef,
  textBlocks,
  selectedBlock,
  onTextClick,
  onCanvasClick,
  isEditing,
}) => {
  const [hoveredBlock, setHoveredBlock] = useState<TextBlock | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find text block under cursor
      const block = textBlocks.find(
        (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
      );

      setHoveredBlock(block || null);
    },
    [textBlocks, isEditing, containerRef]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (hoveredBlock) {
        onTextClick(hoveredBlock, e);
      } else {
        onCanvasClick(x, y, e);
      }
    },
    [hoveredBlock, onTextClick, onCanvasClick, isEditing, containerRef]
  );

  return (
    <div className="pdf-viewer">
      <div
        ref={containerRef}
        className={`pdf-canvas-container ${hoveredBlock ? 'has-hover' : ''} ${isEditing ? 'editing' : ''}`}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => setHoveredBlock(null)}
      >
        {/* Overlay for text block highlighting */}
        <div className="text-overlay">
          {textBlocks.map((block) => (
            <div
              key={block.id}
              className={`text-block-highlight ${
                selectedBlock?.id === block.id ? 'selected' : ''
              } ${hoveredBlock?.id === block.id ? 'hovered' : ''}`}
              style={{
                left: block.x,
                top: block.y,
                width: block.width,
                height: block.height,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
