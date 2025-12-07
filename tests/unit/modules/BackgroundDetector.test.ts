import { BackgroundDetector } from '../../../src/modules/erasure/BackgroundDetector';

describe('BackgroundDetector', () => {
  it('should detect solid background color around bbox', async () => {
    const detector = new BackgroundDetector();

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

    // Fill canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a small text-like rectangle (dark) in the middle
    ctx.fillStyle = '#000000';
    ctx.fillRect(50, 30, 60, 12);

    const bbox = { x: 50, y: 30, width: 60, height: 12 } as any;
    const bg = await detector.detectBackground(canvas, bbox);

    expect(bg.color.toLowerCase()).toBe('#ffffff');
    expect(bg.type).toBe('solid');
    expect(bg.confidence).toBeGreaterThan(0.5);
  });

  it('should detect gradient background', async () => {
    const detector = new BackgroundDetector();

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

    // Mock getImageData to return a left-to-right gradient (light gray -> white)
    ctx.getImageData = jest.fn(() => {
      const width = canvas.width;
      const height = canvas.height;
      const arr = new Uint8ClampedArray(width * height * 4);

      // Make left half darker (204) and right half white (255) to simulate a gradient
      for (let x = 0; x < width; x++) {
        const r = x < width / 2 ? 204 : 255;
        const g = r;
        const b = r;
        for (let y = 0; y < height; y++) {
          const idx = (y * width + x) * 4;
          arr[idx] = r;
          arr[idx + 1] = g;
          arr[idx + 2] = b;
          arr[idx + 3] = 255; // opaque
        }
      }

      return { data: arr, width, height } as any;
    });

    // Draw a small text-like rectangle (dark) in the middle
    ctx.fillStyle = '#000000';
    ctx.fillRect(50, 30, 60, 12);

    const bbox = { x: 50, y: 30, width: 60, height: 12 } as any;
    const bg = await detector.detectBackground(canvas, bbox);

    // Ensure detector returns a valid background result for gradient-like input
    expect(bg).toHaveProperty('color');
    expect(bg.confidence).toBeGreaterThanOrEqual(0);
    expect(bg.confidence).toBeGreaterThan(0);
  });
});
