import React, { useRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePDFEditor } from '@ui/hooks/usePDFEditor';

// Mock the core PDFEditor to avoid heavy dependencies
jest.mock('@core/PDFEditor', () => {
  return {
    PDFEditor: jest.fn().mockImplementation(() => {
      const doc = {
        id: 'doc-1',
        filename: 'test.pdf',
        originalBuffer: new ArrayBuffer(1),
        pageCount: 1,
        metadata: {},
        pages: [
          {
            number: 1,
            width: 100,
            height: 100,
            rotation: 0,
            canvas: null,
            textBlocks: [],
            edits: [],
            metadata: { isScanned: false, ocrProcessed: false, editCount: 0 },
          },
        ],
        edits: [],
        createdAt: new Date(),
        lastModified: new Date(),
      };

      return {
        loadFile: jest.fn(async () => doc),
        renderPage: jest.fn(async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          return canvas;
        }),
        detectText: jest.fn(async () => []),
        setContainer: jest.fn(),
        isLoaded: true,
        currentPageNumber: 1,
        getDocument: jest.fn(() => doc),
        destroy: jest.fn(),
      };
    }),
  };
});

const TestComponent: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const hook = usePDFEditor(ref);
  return (
    <div>
      <button
        data-testid="load"
        onClick={() => hook.loadPDF(new File(['%PDF-1.4 test'], 'test.pdf', { type: 'application/pdf' }))}
      >
        Load
      </button>
      <div data-testid="doc">{hook.document ? hook.document.filename : ''}</div>
    </div>
  );
};

describe('usePDFEditor hook - upload behavior', () => {
  test('loads a PDF even if containerRef is initially null', async () => {
    render(<TestComponent />);

    const loadButton = screen.getByTestId('load');
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByTestId('doc').textContent).toBe('test.pdf');
    });
  });
});
