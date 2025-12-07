import { ReflowEngine } from '../../../src/modules/reflow/ReflowEngine';

describe('ReflowEngine', () => {
  const engine = new ReflowEngine();

  it('should detect when text fits within bounds', () => {
    const style = { fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#000000', backgroundColor: 'transparent', lineHeight: 1.2 } as any;
    const bounds = { x: 0, y: 0, width: 200, height: 20 } as any;
    const res = engine.calculateReflow('Hello', 'Hi', bounds, style);
    expect(res.fits).toBe(true);
    expect(res.overflow).toBe(0);
  });

  it('should detect overflow and return truncated text', () => {
    const style = { fontFamily: 'Arial', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', color: '#000000', backgroundColor: 'transparent', lineHeight: 1.2 } as any;
    const bounds = { x: 0, y: 0, width: 50, height: 30 } as any;
    const res = engine.calculateReflow('A long string that will not fit', 'A long string that will not fit either', bounds, style);
    expect(res.fits).toBe(false);
    expect(typeof res.truncatedText).toBe('string');
    expect(res.truncatedText!.length).toBeGreaterThan(0);
  });

  it('should correctly adjust following blocks positions', () => {
    const blocks = [
      { x: 10, y: 0, width: 20, height: 10 } as any,
      { x: 40, y: 0, width: 20, height: 10 } as any,
      { x: 80, y: 0, width: 20, height: 10 } as any,
    ];

    const delta = 15;
    const startX = 30;

    const adjusted = engine.adjustFollowingBlocks(blocks, startX, delta);

    // Blocks with x > 30 (40 and 80) should be shifted by delta
    expect(adjusted[0].x).toBe(10);
    expect(adjusted[1].x).toBe(55);
    expect(adjusted[2].x).toBe(95);
  });
});
