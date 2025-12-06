/**
 * DocumentInfoPanel - Shows document metadata and statistics
 */

import React, { useState, useRef, useEffect } from 'react';
import type { PDFDocument } from '@core/types';
import './DocumentInfoPanel.css';

interface DocumentInfoPanelProps {
  document: PDFDocument;
  onClose: () => void;
}

export const DocumentInfoPanel: React.FC<DocumentInfoPanelProps> = ({ document, onClose }) => {
  const [fileSize, setFileSize] = useState<string>('--');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Calculate file size from ArrayBuffer
    const bytes = document.originalBuffer.byteLength;
    setFileSize(formatFileSize(bytes));
  }, [document]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const doc = globalThis.document;
    doc.addEventListener('mousedown', handleClickOutside);
    return () => doc.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalEdits = document.edits.length;

  return (
    <div className="document-info-overlay">
      <div className="document-info-panel" ref={panelRef}>
        <div className="document-info-header">
          <h2>Document Information</h2>
          <button className="close-btn" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="document-info-content">
          <div className="info-row">
            <label>Filename:</label>
            <span className="info-value" title={document.filename}>{document.filename}</span>
          </div>

          <div className="info-row">
            <label>Pages:</label>
            <span className="info-value">{document.pageCount}</span>
          </div>

          <div className="info-row">
            <label>File Size:</label>
            <span className="info-value">{fileSize}</span>
          </div>

          <div className="info-row">
            <label>Edits Made:</label>
            <span className="info-value">{totalEdits}</span>
          </div>

          {document.metadata && (
            <>
              {document.metadata.title && (
                <div className="info-row">
                  <label>Title:</label>
                  <span className="info-value">{document.metadata.title}</span>
                </div>
              )}

              {document.metadata.author && (
                <div className="info-row">
                  <label>Author:</label>
                  <span className="info-value">{document.metadata.author}</span>
                </div>
              )}

              {document.metadata.subject && (
                <div className="info-row">
                  <label>Subject:</label>
                  <span className="info-value">{document.metadata.subject}</span>
                </div>
              )}

              {document.metadata.creationDate && (
                <div className="info-row">
                  <label>Created:</label>
                  <span className="info-value">{formatDate(document.metadata.creationDate)}</span>
                </div>
              )}

              {document.metadata.modificationDate && (
                <div className="info-row">
                  <label>Modified:</label>
                  <span className="info-value">{formatDate(document.metadata.modificationDate)}</span>
                </div>
              )}
            </>
          )}

          {document.createdAt && (
            <div className="info-row">
              <label>Loaded At:</label>
              <span className="info-value">{formatDate(document.createdAt)}</span>
            </div>
          )}
        </div>

        <div className="document-info-footer">
          <p className="info-hint">ℹ️ This information is from the PDF metadata.</p>
        </div>
      </div>
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
