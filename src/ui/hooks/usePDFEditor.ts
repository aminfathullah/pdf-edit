/**
 * usePDFEditor - Main hook for PDF editing functionality
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { PDFEditor } from '@core/PDFEditor';
import type { PDFDocument, TextBlock, TextStyle, ExportOptions } from '@core/types';
import { eventBus } from '@utils/EventBus';
import type { ViewportState } from '@core/types';
import { EVENTS } from '@core/constants';

export interface UsePDFEditorReturn {
  // State
  document: PDFDocument | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  viewport: ViewportState;
  textBlocks: TextBlock[];
  selectedBlock: TextBlock | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
  editCount: number;

  // Actions
  loadPDF: (file: File) => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  selectBlock: (block: TextBlock | null) => void;
  startEdit: (blockId: string) => void;
  confirmEdit: (newText: string, newStyle: TextStyle) => void;
  cancelEdit: () => void;
  undo: () => void;
  redo: () => void;
  downloadPDF: (options?: Partial<ExportOptions>) => Promise<void>;
  reset: () => void;
}

export function usePDFEditor(containerRef: React.RefObject<HTMLDivElement>): UsePDFEditorReturn {
  const editorRef = useRef<PDFEditor | null>(null);

  // State
  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoomState] = useState(1);
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1, panX: 0, panY: 0, currentPage: 1 });
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<TextBlock | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [editCount, setEditCount] = useState(0);

  // Initialize editor
  useEffect(() => {
    editorRef.current = new PDFEditor();

    // Set up event listeners
    const handleEditAdded = () => {
      if (editorRef.current) {
        setCanUndo(editorRef.current.canUndo());
        setCanRedo(editorRef.current.canRedo());
        setEditCount(editorRef.current.getEditCount());
      }
    };

    const handleEditRemoved = handleEditAdded;

    eventBus.on('edit:added', handleEditAdded);
    eventBus.on('edit:removed', handleEditRemoved);

    // Viewport updates from canvas manager
    const handleViewportChanged = (vp: any) => {
      setViewport(vp);
      // Also update zoom in state if zoom has changed
      if (typeof vp.zoom === 'number') setZoomState(vp.zoom);
    };

    eventBus.on(EVENTS.VIEWPORT_CHANGED, handleViewportChanged);

    return () => {
      eventBus.off('edit:added', handleEditAdded);
      eventBus.off('edit:removed', handleEditRemoved);
      eventBus.off(EVENTS.VIEWPORT_CHANGED, handleViewportChanged);
      editorRef.current?.destroy();
    };
  }, []);

  // Load PDF
  const loadPDF = useCallback(async (file: File) => {
    if (!editorRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Only set container if it is already available; otherwise load
      // the document into the engine and attach the container later.
      if (containerRef.current) {
        editorRef.current.setContainer(containerRef.current);
      }

      const doc = await editorRef.current.loadFile(file);
      
      if (doc) {
        setDocument(doc);
        setTotalPages(doc.pageCount);
        setCurrentPage(1);
        
        // Render first page and detect text
        await editorRef.current.renderPage(1);
        const blocks = await editorRef.current.detectText(1);
        setTextBlocks(blocks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  }, [containerRef]);

  // If the container becomes available after we have already loaded a
  // document, attach it and re-render the page so the viewer shows the
  // loaded document.
  useEffect(() => {
    if (!editorRef.current || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        editorRef.current!.setContainer(containerRef.current!);

        if (editorRef.current!.isLoaded) {
          const page = editorRef.current!.currentPageNumber;
          await editorRef.current!.renderPage(page);
          const blocks = await editorRef.current!.detectText(page);
          if (!cancelled) {
            setTextBlocks(blocks);
            setCurrentPage(page);
          }
        }
      } catch (err) {
        // Ignore - this shouldn't throw for normal setup
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [containerRef.current]);

  // Page navigation
  const goToPage = useCallback(async (page: number) => {
    if (!editorRef.current || page < 1 || page > totalPages) return;

    setIsProcessing(true);
    setSelectedBlock(null);

    try {
      await editorRef.current.goToPage(page);
      const blocks = await editorRef.current.detectText(page);
      
      setCurrentPage(page);
      setTextBlocks(blocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render page');
    } finally {
      setIsProcessing(false);
    }
  }, [totalPages]);

  const nextPage = useCallback(async () => {
    if (currentPage < totalPages) {
      await goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(async () => {
    if (currentPage > 1) {
      await goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  // Zoom
  const setZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(0.25, Math.min(4, newZoom));
    setZoomState(clampedZoom);
    editorRef.current?.setZoom(clampedZoom);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(zoom * 1.25);
  }, [zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(zoom / 1.25);
  }, [zoom, setZoom]);

  const zoomReset = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  // Editing
  const selectBlock = useCallback((block: TextBlock | null) => {
    setSelectedBlock(block);
  }, []);

  const startEdit = useCallback((blockId: string) => {
    if (!editorRef.current) return;
    editorRef.current.startEdit(blockId);
  }, []);

  const confirmEdit = useCallback((newText: string, newStyle: TextStyle) => {
    if (!editorRef.current || !selectedBlock) return;

    try {
      editorRef.current.confirmEdit(selectedBlock.id, newText, newStyle);
      
      // Update text blocks
      const doc = editorRef.current.getDocument();
      const page = doc?.pages.find(p => p.number === currentPage);
      setTextBlocks(page?.textBlocks || []);
      setSelectedBlock(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply edit');
    }
  }, [selectedBlock, currentPage]);

  const cancelEdit = useCallback(() => {
    if (selectedBlock) {
      editorRef.current?.cancelEdit(selectedBlock.id);
    }
    setSelectedBlock(null);
  }, [selectedBlock]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.undo();
    
    const doc = editorRef.current.getDocument();
    const page = doc?.pages.find(p => p.number === currentPage);
    setTextBlocks(page?.textBlocks || []);
  }, [currentPage]);

  const redo = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.redo();
    
    const doc = editorRef.current.getDocument();
    const page = doc?.pages.find(p => p.number === currentPage);
    setTextBlocks(page?.textBlocks || []);
  }, [currentPage]);

  // Download
  const downloadPDF = useCallback(async (options?: Partial<ExportOptions>) => {
    if (!editorRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      await editorRef.current.downloadPDF(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Reset
  const reset = useCallback(() => {
    editorRef.current?.destroy();
    editorRef.current = new PDFEditor();
    
    setDocument(null);
    setCurrentPage(1);
    setTotalPages(0);
    setZoomState(1);
    setTextBlocks([]);
    setSelectedBlock(null);
    setIsLoading(false);
    setIsProcessing(false);
    setError(null);
    setCanUndo(false);
    setCanRedo(false);
    setEditCount(0);
  }, []);

  return {
    document,
    currentPage,
    totalPages,
    zoom,
    viewport,
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
    setZoom,
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
  };
}
