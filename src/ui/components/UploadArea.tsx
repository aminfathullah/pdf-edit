/**
 * UploadArea - Drag and Drop PDF Upload Component
 */

import React, { useCallback, useState, useRef } from 'react';
import { formatFileSize } from '@utils/helpers';
import { FILE_CONSTRAINTS } from '@core/constants';
import { validatePDFMagicBytes } from '@utils/validators';
import './UploadArea.css';

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  onFileSelect,
  isLoading = false,
  error = null,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setValidationError(null);

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('Please select a PDF file');
      return false;
    }

    if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
      setValidationError(
        `File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)})`
      );
      return false;
    }

    return true;
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return;

      // Verify PDF magic bytes (first bytes of file) as per spec
      try {
        const magic = await validatePDFMagicBytes(file);
        if (!magic.isValid) {
          setValidationError(magic.error || 'Invalid PDF file');
          return;
        }
      } catch (err) {
        setValidationError('Failed to verify PDF file');
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type === 'application/pdf') {
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
          }
          break;
        }
      }
    },
    [handleFile]
  );

  const displayError = error || validationError;

  return (
    <div
      className={`upload-area ${isDragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      onPaste={handlePaste}
      tabIndex={0}
      role="button"
      aria-label="Upload PDF file"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {isLoading ? (
        <div className="upload-loading">
          <div className="spinner"></div>
          <p>Loading PDF...</p>
        </div>
      ) : (
        <>
          <div className="upload-icon">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z" />
            </svg>
          </div>
          <h2>Drop PDF here</h2>
          <p>or click to browse</p>
          <p className="upload-hint">Maximum file size: {formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)}</p>
        </>
      )}

      {displayError && (
        <div className="upload-error" role="alert">
          {displayError}
        </div>
      )}
    </div>
  );
};
