/**
 * TextDetector Unit Tests
 */

import { TextDetector } from '../../../src/modules/detection/TextDetector';

describe('TextDetector', () => {
  it('should extract text blocks and include color when provided', async () => {
    const detector = new TextDetector();

    // Create fake PDF page with text content
    const fakePage = {
      getTextContent: async () => ({
        items: [
          {
            str: 'Hello',
            transform: [1, 0, 0, 1, 10, 20],
            width: 50,
            height: 12,
            fontName: 'Arial',
            fillColor: '#ff0000',
          },
        ],
      }),
      getViewport: (_: any) => ({ width: 200, height: 300 }),
    };

    // Fake PDF document proxy
    const fakePDF = {
      getPage: async (_: number) => fakePage,
    } as any;

    detector.setPDF(fakePDF as any);

    const blocks = await detector.extractText(1);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].style.color).toBe('#ff0000');
  });

  it('should detect vertical text and layout character boxes vertically', async () => {
    const detector = new (require('../../../src/modules/detection/TextDetector').TextDetector)();

    const fakePage = {
      getTextContent: async () => ({
        items: [
          {
            str: '縦書き',
            transform: [0, 1, -1, 0, 50, 60],
            width: 24,
            height: 24,
            fontName: 'CIDFont+TEST',
            dir: 'ttb',
          },
        ],
      }),
      getViewport: (_: any) => ({ width: 200, height: 300 }),
    };

    const fakePDF = {
      getPage: async (_: number) => fakePage,
    } as any;

    detector.setPDF(fakePDF as any);

    const blocks = await detector.extractText(1);
    expect(blocks.length).toBeGreaterThan(0);
    const boxes = blocks[0].boxes;
    expect(boxes.length).toBe(3);
    // Ensure vertical layout: y increases across characters
    expect(boxes[0].y).toBeLessThan(boxes[1].y);
    expect(boxes[1].y).toBeLessThan(boxes[2].y);
  });

  it('should correctly return page text with UTF-8 and CID encoded fonts', async () => {
    const detector = new (require('../../../src/modules/detection/TextDetector').TextDetector)();

    const unicodeText = 'Résumé — テスト — 用户';
    const fakePage = {
      getTextContent: async () => ({
        items: [
          {
            str: unicodeText,
            transform: [1, 0, 0, 1, 10, 20],
            width: 200,
            height: 12,
            fontName: 'CIDFont+UTF8Test',
            fillColor: '#000000',
          },
        ],
      }),
      getViewport: (_: any) => ({ width: 400, height: 600 }),
    };

    const fakePDF = {
      getPage: async (_: number) => fakePage,
    } as any;

    detector.setPDF(fakePDF as any);

    const text = await detector.getPageText(1);
    expect(text).toContain('Résumé');
    expect(text).toContain('テスト');
    expect(text).toContain('用户');
  });

  it('should pick the smallest area block when text regions overlap', async () => {
    const detector = new (require('../../../src/modules/detection/TextDetector').TextDetector)();

    // Two overlapping blocks: block1 larger area, block2 smaller and sits on top of block1
    const fakePage = {
      getTextContent: async () => ({
        items: [
          // Larger block
          {
            str: 'LargeBlock',
            transform: [1, 0, 0, 1, 100, 200], // x=100, y=100 (viewport.height 300)
            width: 200,
            height: 50,
            fontName: 'Arial',
          },
          // Smaller block overlapping
          {
            str: 'Small',
            transform: [1, 0, 0, 1, 120, 190], // x=120, y=110, overlapping area
            width: 60,
            height: 20,
            fontName: 'Arial',
          },
        ],
      }),
      getViewport: (_: any) => ({ width: 400, height: 300 }),
    };

    const fakePDF = {
      getPage: async (_: number) => fakePage,
    } as any;

    detector.setPDF(fakePDF as any);
    await detector.extractText(1);

    // Click in region overlapped by both blocks
    const overlappingX = 125;
    const overlappingY = 115; // Should be inside both

    const chosenBlock = detector.findBlockAtPosition(1, overlappingX, overlappingY);
    expect(chosenBlock).toBeDefined();
    expect(chosenBlock!.text.indexOf('Small') >= 0).toBe(true);
  });
});
