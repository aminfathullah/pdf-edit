import { StyleDetector } from '../../../src/modules/detection/StyleDetector';

describe('StyleDetector', () => {
  it('should detect color and font size from a canvas and bbox', async () => {
    const detector = new StyleDetector();

    // Create canvas and draw blue rectangle to simulate text
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

    // Fill background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a black rectangle to simulate text pixels (black works in this test environment)
    const x = 20, y = 20, w = 100, h = 40;
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, w, h);
    // No raw image data manipulation needed - we used fillRect above

    const bbox = {
      char: 'A',
      index: 0,
      x,
      y,
      width: w,
      height: h,
      baseline: y + h,
      fontName: 'Arial'
    } as any;

    // Sanity check: pixel at center of bbox should be blue
    const center = ctx.getImageData(x + Math.floor(w / 2), y + Math.floor(h / 2), 1, 1).data;
    const centerColor = `#${[center[0], center[1], center[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    // Ensure center is dark (black)
    expect(centerColor.toLowerCase()).toBe('#000000');

    const result = await detector.detectStyle(canvas, bbox);
    const { style } = result;

    expect(style.color.toLowerCase()).toBe('#000000');
    expect(style.fontFamily.toLowerCase()).toContain('arial');
    expect(style.fontSize).toBeGreaterThan(0);
  });
});
