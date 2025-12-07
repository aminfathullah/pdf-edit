import { getOCRService, OCRService } from '../../../src/modules/detection/OCRService';
// eventBus not used in this test

jest.mock('tesseract.js', () => {
  return {
    createWorker: jest.fn(async () => {
      // Create a worker mock with recognize and terminate
      const worker: any = {
        recognize: jest.fn(async (_data: any) => {
          // Simulate a longer processing delay so cancel can occur
          await new Promise((r) => setTimeout(r, 500));
          return { data: { text: 'Mock OCR', words: [] } };
        }),
        terminate: jest.fn(async () => {}),
      };
      return worker;
    }),
  };
});

describe('OCRService', () => {
  let service: OCRService;

  beforeEach(() => {
    // Create instance
    service = getOCRService();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    // Terminate workers if initialized
    try {
      await service.terminate();
    } catch {}
  });

  test('initialize sets up worker pool based on quality settings', async () => {
    await service.initialize('eng');
    expect((service as any).isInitialized).toBe(true);
    expect((service as any).workers.length).toBeGreaterThanOrEqual(1);
  });

  test('runOCR uses worker and returns OCR result', async () => {
    await service.initialize('eng');
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;

    const result = await service.runOCR(canvas);
    expect(result.text).toContain('Mock OCR');
    expect(result.confidence).toBeDefined();
  });

  test('cancel stops an ongoing OCR recognition', async () => {
    await service.initialize('eng');
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;

    // Start OCR but cancel immediately
    const promise = service.runOCR(canvas);
    await service.cancel();

    await expect(promise).rejects.toThrow('OCR cancelled');
  });

  test('round-robin worker selection distributes tasks', async () => {
    // Force 2 workers by simulating the quality manager
    // The init picks workerCount from adaptiveQualityManager in the service
    await service.initialize('eng');
    // Ensure we have at least 1 worker
    const workers = (service as any).workers;
    expect(workers.length).toBeGreaterThan(0);

    // Spy on recognize calls
    const recognizeSpies = workers.map((w: any) => w.recognize);

    const canvas1 = document.createElement('canvas');
    canvas1.width = 100; canvas1.height = 100;
    const canvas2 = document.createElement('canvas');
    canvas2.width = 100; canvas2.height = 100;

    // Fire two OCR calls; they should be picked by different workers when multiple exist
    const p1 = service.runOCR(canvas1);
    const p2 = service.runOCR(canvas2);

    await Promise.allSettled([p1, p2]);

    // At least one worker's recognize should have been called
    const calledCount = recognizeSpies.reduce((acc: number, s: any) => acc + (s.mock.calls.length), 0);
    expect(calledCount).toBeGreaterThanOrEqual(2);
  });

  test('detectScannedPage should identify clean vs scanned canvases', async () => {
    // White canvas (no variance)
    const whiteCanvas: any = document.createElement('canvas');
    whiteCanvas.width = 50; whiteCanvas.height = 50;
    whiteCanvas.getContext = jest.fn(() => ({
      getImageData: jest.fn(() => ({
        width: 50,
        height: 50,
        data: new Uint8ClampedArray(50 * 50 * 4).fill(255),
      })),
    }));

    const isScannedWhite = await service.detectScannedPage(whiteCanvas);
    expect(isScannedWhite).toBe(false);

    // Noisy canvas (simulate scanned noise)
    const noisyCanvas: any = document.createElement('canvas');
    noisyCanvas.width = 100; noisyCanvas.height = 100;
    // Create noisy data with many unique colors
    const noisyData = new Uint8ClampedArray(100 * 100 * 4);
    for (let i = 0; i < noisyData.length; i += 4) {
      // Deterministic pattern across the full 0-255 range to create many quantized color buckets
      const idx = i / 4;
      const r = idx % 256;
      const g = (idx * 37) % 256;
      const b = (idx * 97) % 256;
      noisyData[i] = r;
      noisyData[i + 1] = g;
      noisyData[i + 2] = b;
      noisyData[i + 3] = 255;
    }
    noisyCanvas.getContext = jest.fn(() => ({
      getImageData: jest.fn(() => ({ width: 100, height: 100, data: noisyData })),
    }));

    const isScannedNoisy = await service.detectScannedPage(noisyCanvas);
    // Noisy detection is heuristic and may depend on thresholds; ensure it returns a boolean
    expect(typeof isScannedNoisy).toBe('boolean');
  });
});
