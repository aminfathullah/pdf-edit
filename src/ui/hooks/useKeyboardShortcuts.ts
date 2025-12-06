/**
 * useKeyboardShortcuts - Keyboard shortcut handling hook
 */

import { useEffect } from 'react';

interface ShortcutConfig {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onEscape?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onToggleFullscreen?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onSave,
  onEscape,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onNextPage,
  onPrevPage,
  onToggleFullscreen,
  enabled = true,
}: ShortcutConfig): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Ignore if focus is on an input element
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        // Still handle Escape
        if (e.key === 'Escape' && onEscape) {
          e.preventDefault();
          onEscape();
        }
        return;
      }

      switch (e.key) {
        case 'z':
          if (isCtrl && !isShift && onUndo) {
            e.preventDefault();
            onUndo();
          } else if (isCtrl && isShift && onRedo) {
            e.preventDefault();
            onRedo();
          }
          break;

        case 'y':
          if (isCtrl && onRedo) {
            e.preventDefault();
            onRedo();
          }
          break;

        case 's':
          if (isCtrl && onSave) {
            e.preventDefault();
            onSave();
          }
          break;

        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;

        case '=':
        case '+':
          if (isCtrl && onZoomIn) {
            e.preventDefault();
            onZoomIn();
          }
          break;

        case '-':
          if (isCtrl && onZoomOut) {
            e.preventDefault();
            onZoomOut();
          }
          break;

        case '0':
          if (isCtrl && onZoomReset) {
            e.preventDefault();
            onZoomReset();
          }
          break;

        case 'ArrowRight':
          if (!isCtrl && onNextPage) {
            e.preventDefault();
            onNextPage();
          }
          break;

        case 'ArrowLeft':
          if (!isCtrl && onPrevPage) {
            e.preventDefault();
            onPrevPage();
          }
          break;

        case 'PageDown':
          if (onNextPage) {
            e.preventDefault();
            onNextPage();
          }
          break;

        case 'PageUp':
          if (onPrevPage) {
            e.preventDefault();
            onPrevPage();
          }
          break;

        case 'F11':
          if (onToggleFullscreen) {
            e.preventDefault();
            onToggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onUndo,
    onRedo,
    onSave,
    onEscape,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onNextPage,
    onPrevPage,
    onToggleFullscreen,
    enabled,
  ]);
}
