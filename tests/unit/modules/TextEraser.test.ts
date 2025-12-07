import { TextEraser } from '../../../src/modules/erasure/TextEraser';

describe('TextEraser', () => {
  it('should erase a region and composite with original', () => {
    const eraser = new TextEraser();

    const orig = document.createElement('canvas');
    orig.width = 200;
    orig.height = 100;
    const octx = orig.getContext('2d')!;

    // Fill background white
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, orig.width, orig.height);

    // Draw red text rectangle
    octx.fillStyle = '#ff0000';
    octx.fillRect(40, 30, 80, 12);

    // Initialize eraser and erase text
    eraser.initialize(orig.width, orig.height);

    // In the test environment, gradient creation may not be implemented; stub the soft edges method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (eraser as any).applySoftEdges = () => {};

    eraser.eraseText('edit-1', { x: 40, y: 30, width: 80, height: 12 } as any, '#ffffff');

    // The erasure canvas should now have a white region where text was
    // Ensure the erased region is tracked
    const erased = eraser.getErasedRegions();
    expect(erased.has('edit-1')).toBe(true);

    // Composite result should be a canvas with same dimensions
    const composite = eraser.composite(orig);
    expect(composite.width).toBe(orig.width);
    expect(composite.height).toBe(orig.height);
  });
});
