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
});
