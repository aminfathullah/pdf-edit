import { render, waitFor } from '@testing-library/react';
import { EditorPage } from '@ui/pages/EditorPage';
import type { TextBlock } from '@core/types';

// Mock the hooks used by EditorPage
jest.mock('@ui/hooks', () => ({
  usePDFEditor: jest.fn(),
  useKeyboardShortcuts: jest.fn(() => ({})),
}));

import { usePDFEditor } from '@ui/hooks';

describe('EditorPage overlay positioning', () => {
  test('EditBox uses viewport pan offsets when computing overlay position', async () => {
    // The EditorPage renders a .pdf-canvas-container; we will inject an inner
    // .pdf-canvas-wrapper with known dimensions after render so getBoundingClientRect reflects values

    // Detect selected block
    const selectedBlock: TextBlock = {
      id: 'b1',
      text: 'Hello',
      boxes: [],
      style: { fontFamily: 'Arial', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#000', backgroundColor: 'transparent', lineHeight: 1.2 },
      source: 'digital',
      confidence: 0.95,
      x: 50,
      y: 20,
      width: 100,
      height: 20,
      pageNumber: 1,
    };

    // Set viewport with a non-zero pan to verify offsets are included
    const viewport = { zoom: 2, panX: 10, panY: 20, currentPage: 1 };

    // Mock usePDFEditor to return a static state
    (usePDFEditor as jest.Mock).mockReturnValue({
      document: { filename: 'test.pdf', id: 'd1', originalBuffer: new ArrayBuffer(0), pageCount: 1, metadata: { title: '', author: '', subject: '', keywords: [], producer: '', creationDate: null, modificationDate: null }, pages: [], edits: [], createdAt: new Date(), lastModified: new Date() },
      currentPage: 1,
      totalPages: 1,
      zoom: viewport.zoom,
      viewport,
      textBlocks: [selectedBlock],
      selectedBlock,
      isLoading: false,
      isProcessing: false,
      error: null,
      canUndo: false,
      canRedo: false,
      editCount: 0,
      loadPDF: jest.fn(),
      goToPage: jest.fn(),
      nextPage: jest.fn(),
      prevPage: jest.fn(),
      setZoom: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      zoomReset: jest.fn(),
      selectBlock: jest.fn(),
      startEdit: jest.fn(),
      confirmEdit: jest.fn(),
      cancelEdit: jest.fn(),
      undo: jest.fn(),
      redo: jest.fn(),
      downloadPDF: jest.fn(),
      reset: jest.fn(),
    });

    // Render the page
    const { container } = render(<EditorPage />);

    // Find the viewer container that EditorPage should have mounted
    const actualContainer = document.querySelector('.pdf-canvas-container') as HTMLElement;
    expect(actualContainer).toBeTruthy();

    // Append a wrapper with set dimensions so the bounding rect is meaningful
    const containerEl = document.createElement('div');
    containerEl.className = 'pdf-canvas-wrapper';
    containerEl.style.position = 'relative';
    containerEl.style.width = '600px';
    containerEl.style.height = '800px';
    actualContainer.appendChild(containerEl);

    const rect = containerEl.getBoundingClientRect();
    const expectedX = rect.left + viewport.panX + selectedBlock.x * viewport.zoom;
    const expectedY = rect.top + viewport.panY + selectedBlock.y * viewport.zoom;

    // The edit box should render a textarea positioned by the computed coords
    await waitFor(() => {
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement | null;
      expect(textarea).toBeTruthy();
      if (textarea) {
        // Inline styles set left/top in pixels
        expect(textarea.style.left).toBe(`${expectedX}px`);
        expect(textarea.style.top).toBe(`${expectedY}px`);
      }
    });
  });
});
