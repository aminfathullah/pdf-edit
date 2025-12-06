/**
 * Toolbar - Top Navigation and Controls
 */

import React from 'react';
import './Toolbar.css';

interface ToolbarProps {
  filename?: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  editCount: number;
  isFullscreen?: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  onNewFile: () => void;
  onToggleFullscreen?: () => void;
  onShowDocInfo?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  filename,
  currentPage,
  totalPages,
  zoom,
  canUndo,
  canRedo,
  editCount,
  isFullscreen,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onUndo,
  onRedo,
  onDownload,
  onNewFile,
  onToggleFullscreen,
  onShowDocInfo,
}) => {
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onGoToPage(page);
    }
  };

  const handlePageInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      e.target.value = String(currentPage);
    }
  };

  return (
    <div className="toolbar">
      {/* Left section - File info */}
      <div className="toolbar-section toolbar-left">
        <button className="toolbar-btn" onClick={onNewFile} title="Open new file">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
        {filename && (
          <>
            <span className="toolbar-filename" title={filename}>{filename}</span>
            {onShowDocInfo && (
              <button className="toolbar-btn toolbar-info-btn" onClick={onShowDocInfo} title="Show document information">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Center section - Navigation */}
      <div className="toolbar-section toolbar-center">
        <button
          className="toolbar-btn"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          title="Previous page"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        <div className="page-indicator">
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            key={currentPage}
            onChange={handlePageInputChange}
            onBlur={handlePageInputBlur}
            className="page-input"
          />
          <span>of {totalPages}</span>
        </div>

        <button
          className="toolbar-btn"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          title="Next page"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>

        <div className="toolbar-divider" />

        {/* Zoom controls */}
        <button className="toolbar-btn" onClick={onZoomOut} title="Zoom out">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13H5v-2h14v2z" />
          </svg>
        </button>

        <span className="zoom-indicator" onClick={onZoomReset} title="Reset zoom">
          {Math.round(zoom * 100)}%
        </span>

        <button className="toolbar-btn" onClick={onZoomIn} title="Zoom in">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>

        {onToggleFullscreen && (
          <button className="toolbar-btn" onClick={onToggleFullscreen} title="Toggle fullscreen (F11)">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              {isFullscreen ? (
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              ) : (
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Right section - Edit controls */}
      <div className="toolbar-section toolbar-right">
        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
          </svg>
        </button>

        <button
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
          </svg>
        </button>

        {editCount > 0 && (
          <span className="edit-count">{editCount} edit{editCount !== 1 ? 's' : ''}</span>
        )}

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onDownload}
          disabled={totalPages === 0}
          title="Download edited PDF"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};
