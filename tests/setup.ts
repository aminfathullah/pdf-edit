/**
 * Test setup file for Jest
 */

import '@testing-library/jest-dom';

// Mock canvas
class MockCanvasRenderingContext2D {
  canvas = { width: 100, height: 100 };
  fillStyle = '';
  strokeStyle = '';
  font = '';
  textAlign = 'left' as CanvasTextAlign;
  textBaseline = 'alphabetic' as CanvasTextBaseline;
  globalAlpha = 1;
  
  fillRect = jest.fn();
  strokeRect = jest.fn();
  clearRect = jest.fn();
  fillText = jest.fn();
  strokeText = jest.fn();
  measureText = jest.fn(() => ({ width: 100 }));
  beginPath = jest.fn();
  closePath = jest.fn();
  moveTo = jest.fn();
  lineTo = jest.fn();
  arc = jest.fn();
  fill = jest.fn();
  stroke = jest.fn();
  drawImage = jest.fn();
  getImageData = jest.fn(() => ({
    data: new Uint8ClampedArray(100 * 100 * 4),
    width: 100,
    height: 100,
  }));
  putImageData = jest.fn();
  save = jest.fn();
  restore = jest.fn();
  scale = jest.fn();
  rotate = jest.fn();
  translate = jest.fn();
  transform = jest.fn();
  setTransform = jest.fn();
  createLinearGradient = jest.fn();
  createRadialGradient = jest.fn();
  createPattern = jest.fn();
}

HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
  if (contextId === '2d') {
    return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
  }
  return null;
}) as any;

HTMLCanvasElement.prototype.toBlob = jest.fn((callback: (blob: Blob | null) => void) => {
  callback(new Blob(['test'], { type: 'image/png' }));
});

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test');

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console errors during tests (optional)
// jest.spyOn(console, 'error').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {});
