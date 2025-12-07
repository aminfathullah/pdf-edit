/**
 * PDFViewer - Main PDF Display Component
 */

import React, { useState, useCallback } from 'react';
import type { TextBlock, ViewportState } from '@core/types';
import './PDFViewer.css';

interface PDFViewerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  textBlocks: TextBlock[];
  selectedBlock: TextBlock | null;
  onTextClick: (block: TextBlock, event: React.MouseEvent) => void;
  onCanvasClick: (x: number, y: number, event: React.MouseEvent) => void;
  isEditing: boolean;
  viewport: ViewportState;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  containerRef,
  textBlocks,
  selectedBlock,
  onTextClick,
  onCanvasClick,
  isEditing,
  viewport,
}) => {
  const [hoveredBlock, setHoveredBlock] = useState<TextBlock | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing || !containerRef.current) return;

      const wrapper = containerRef.current?.querySelector('.pdf-canvas-wrapper') as HTMLElement | null;
      const rect = wrapper?.getBoundingClientRect() || containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Convert to canvas coordinates by accounting for pan & zoom
      const canvasX = x / viewport.zoom;
      const canvasY = y / viewport.zoom;

      // Find text block under cursor
      const block = textBlocks.find(
        (b) => canvasX >= b.x && canvasX <= b.x + b.width && canvasY >= b.y && canvasY <= b.y + b.height
      );

      setHoveredBlock(block || null);
      setMousePos({ x: x, y: y });
    },
    [textBlocks, isEditing, containerRef, viewport]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing || !containerRef.current) return;

      const wrapper = containerRef.current?.querySelector('.pdf-canvas-wrapper') as HTMLElement | null;
      const rect = wrapper?.getBoundingClientRect() || containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const canvasX = x / viewport.zoom;
      const canvasY = y / viewport.zoom;

      if (hoveredBlock) {
        onTextClick(hoveredBlock, e);
      } else {
        onCanvasClick(canvasX, canvasY, e);
      }
    },
    [hoveredBlock, onTextClick, onCanvasClick, isEditing, containerRef, viewport]
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
        <div
          className="text-overlay"
          style={{ transform: `translate(${viewport.panX}px, ${viewport.panY}px)`, transformOrigin: '0 0' }}
        >
          {textBlocks.map((block) => {
            const confidenceClass = block.confidence < 0.6 ? 'low-confidence' : block.confidence < 0.9 ? 'medium-confidence' : 'high-confidence';
            const sourceClass = block.source === 'ocr' ? 'source-scanned' : 'source-digital';
            return (
              <div
                key={block.id}
                className={`text-block-highlight ${sourceClass} ${confidenceClass} ${
                  selectedBlock?.id === block.id ? 'selected' : ''
                } ${hoveredBlock?.id === block.id ? 'hovered' : ''}`}
              style={{
                  left: block.x * viewport.zoom,
                  top: block.y * viewport.zoom,
                  width: block.width * viewport.zoom,
                  height: block.height * viewport.zoom,
                }}
            />
          );
        })}
        </div>
        {/* Tooltip for hovered block */}
        {hoveredBlock && mousePos && (
          <div
            className="text-tooltip"
            style={{
              left: mousePos.x * viewport.zoom + 12,
              top: mousePos.y * viewport.zoom + 12,
              position: 'absolute',
              zIndex: 2000,
            }}
            role="tooltip"
          >
            <div className="tooltip-content">{hoveredBlock.text}</div>
          </div>
        )}
      </div>
    </div>
  );
};
