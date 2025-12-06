/**
 * EditorPage - Main PDF Editor Page Component
 */

import React, { useRef, useCallback, useState } from 'react';
import { UploadArea, Toolbar, PDFViewer, EditBox, DocumentInfoPanel } from '../components';
import { usePDFEditor, useKeyboardShortcuts } from '../hooks';
import type { TextBlock, TextStyle } from '@core/types';
import './EditorPage.css';

export const EditorPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDocInfo, setShowDocInfo] = useState(false);
  
  const {
    document,
    currentPage,
    totalPages,
    zoom,
    textBlocks,
    selectedBlock,
    isLoading,
    isProcessing,
    error,
    canUndo,
    canRedo,
    editCount,
    loadPDF,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    zoomReset,
    selectBlock,
    startEdit,
    confirmEdit,
    cancelEdit,
    undo,
    redo,
    downloadPDF,
    reset,
  } = usePDFEditor(containerRef);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onSave: () => downloadPDF(),
    onEscape: cancelEdit,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onZoomReset: zoomReset,
    onNextPage: nextPage,
    onPrevPage: prevPage,
    enabled: !selectedBlock, // Disable when editing
  });

  const toggleFullscreen = useCallback(async () => {
    const elem = containerRef.current?.parentElement;
    if (!elem) return;
    
    try {
      if (!isFullscreen) {
        // Request fullscreen
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        const doc = globalThis.document as any;
        if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement) {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
          }
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = globalThis.document as any;
      const isCurrentlyFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
    };

    const doc = globalThis.document as any;
    doc.addEventListener('fullscreenchange', handleFullscreenChange);
    doc.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    doc.addEventListener('mozfullscreenchange', handleFullscreenChange);
    doc.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      doc.removeEventListener('fullscreenchange', handleFullscreenChange);
      doc.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      doc.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      doc.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    loadPDF(file);
  }, [loadPDF]);

  const handleTextClick = useCallback((block: TextBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    selectBlock(block);
    startEdit(block.id);
  }, [selectBlock, startEdit]);

  const handleCanvasClick = useCallback((_x: number, _y: number, _e: React.MouseEvent) => {
    // Deselect if clicking outside
    if (selectedBlock) {
      selectBlock(null);
    }
  }, [selectedBlock, selectBlock]);

  const handleEditConfirm = useCallback((newText: string, newStyle: TextStyle) => {
    confirmEdit(newText, newStyle);
  }, [confirmEdit]);

  const handleDownload = useCallback(() => {
    downloadPDF();
  }, [downloadPDF]);

  // No document loaded - show upload area
  if (!document) {
    return (
      <div className="editor-page editor-page-empty">
        <div className="upload-container">
          <h1>PDF Text Editor</h1>
          <p className="subtitle">Edit text in PDF files directly in your browser</p>
          <UploadArea
            onFileSelect={handleFileSelect}
            isLoading={isLoading}
            error={error}
          />
          <div className="features">
            <div className="feature">
              <span className="feature-icon">🔒</span>
              <span>100% Local Processing</span>
            </div>
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <span>Instant Editing</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📝</span>
              <span>Smart Text Detection</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Document loaded - show editor
  return (
    <div className="editor-page">
      <Toolbar
        filename={document.filename}
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        canUndo={canUndo}
        canRedo={canRedo}
        editCount={editCount}
        isFullscreen={isFullscreen}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onGoToPage={goToPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        onUndo={undo}
        onRedo={redo}
        onDownload={handleDownload}
        onNewFile={reset}
        onToggleFullscreen={toggleFullscreen}
        onShowDocInfo={() => setShowDocInfo(true)}
      />

      <PDFViewer
        containerRef={containerRef}
        textBlocks={textBlocks}
        selectedBlock={selectedBlock}
        onTextClick={handleTextClick}
        onCanvasClick={handleCanvasClick}
        isEditing={!!selectedBlock}
      />

      {/* Edit box for selected text */}
      {selectedBlock && (
        <EditBox
          originalText={selectedBlock.text}
          style={selectedBlock.style}
          position={{ x: selectedBlock.x, y: selectedBlock.y }}
          onConfirm={handleEditConfirm}
          onCancel={cancelEdit}
        />
      )}

      {/* Loading overlay */}
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <p>Processing...</p>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="error-toast" role="alert">
          {error}
        </div>
      )}

      {/* Document Info Panel */}
      {showDocInfo && (
        <DocumentInfoPanel
          document={document}
          onClose={() => setShowDocInfo(false)}
        />
      )}
    </div>
  );
};
