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
});
