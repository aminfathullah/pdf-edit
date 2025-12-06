/**
 * EditBox - Text Editing Component
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { TextStyle } from '@core/types';
import './EditBox.css';

interface EditBoxProps {
  originalText: string;
  style: TextStyle;
  position: { x: number; y: number };
  onConfirm: (newText: string, newStyle: TextStyle) => void;
  onCancel: () => void;
}

export const EditBox: React.FC<EditBoxProps> = ({
  originalText,
  style,
  position,
  onConfirm,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(originalText);
  const [currentStyle] = useState(style);

  useEffect(() => {
    // Focus and select text on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onConfirm(text, currentStyle);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [text, currentStyle, onConfirm, onCancel]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(text, currentStyle);
  }, [text, currentStyle, onConfirm]);

  const textareaStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    fontFamily: currentStyle.fontFamily,
    fontSize: `${currentStyle.fontSize}px`,
    fontWeight: currentStyle.fontWeight,
    fontStyle: currentStyle.fontStyle,
    color: currentStyle.color,
    textDecoration: currentStyle.textDecoration,
    lineHeight: currentStyle.lineHeight,
    padding: '4px 6px',
    border: '2px solid #0066cc',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    resize: 'none',
    minWidth: '100px',
    minHeight: '30px',
    outline: 'none',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  };

  return (
    <div className="edit-box-container">
      {/* Style badges */}
      <div
        className="style-badges"
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y - 30}px`,
          zIndex: 1001,
        }}
      >
        <span className="badge font-badge">{currentStyle.fontFamily.split(',')[0]}</span>
        <span className="badge size-badge">{currentStyle.fontSize}px</span>
        <span
          className="badge color-badge"
          style={{ backgroundColor: currentStyle.color }}
          title={currentStyle.color}
        />
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        style={textareaStyle}
        rows={1}
      />

      {/* Controls */}
      <div
        className="edit-controls"
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y + currentStyle.fontSize + 20}px`,
          zIndex: 1001,
        }}
      >
        <button className="btn btn-confirm" onClick={handleConfirm}>
          ✓ Apply
        </button>
        <button className="btn btn-cancel" onClick={onCancel}>
          ✕ Cancel
        </button>
        <span className="edit-hint">Ctrl+Enter to apply, Esc to cancel</span>
      </div>
    </div>
  );
};
