/**
 * Tesseract Web Worker
 * Runs OCR processing in a separate thread
 */

import { createWorker, Worker } from 'tesseract.js';

let worker: Worker | null = null;

interface OCRMessage {
  type: 'init' | 'recognize' | 'terminate';
  payload?: {
    language?: string;
    imageData?: ImageData;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

interface OCRResult {
  type: 'ready' | 'progress' | 'result' | 'error';
  payload?: any;
}

// Initialize worker on first use
async function initWorker(language: string = 'eng'): Promise<void> {
  if (worker) {
    await worker.terminate();
  }

  worker = await createWorker(language, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        self.postMessage({
          type: 'progress',
          payload: { progress: m.progress },
        } as OCRResult);
      }
    },
  });

  self.postMessage({ type: 'ready' } as OCRResult);
}

// Recognize text in image
async function recognize(imageData: ImageData): Promise<void> {
  if (!worker) {
    throw new Error('Worker not initialized');
  }

  try {
    const result = await worker.recognize(imageData);

    self.postMessage({
      type: 'result',
      payload: {
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words.map((word) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox,
        })),
        chars: result.data.symbols?.map((char) => ({
          text: char.text,
          confidence: char.confidence,
          bbox: char.bbox,
        })),
      },
    } as OCRResult);
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: { error: (error as Error).message },
    } as OCRResult);
  }
}

// Terminate worker
async function terminate(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<OCRMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'init':
        await initWorker(payload?.language);
        break;

      case 'recognize':
        if (payload?.imageData) {
          await recognize(payload.imageData);
        }
        break;

      case 'terminate':
        await terminate();
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: { error: (error as Error).message },
    } as OCRResult);
  }
};

// Export for TypeScript
export {};
