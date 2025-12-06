/**
 * TextEraser - Text Removal and White-Out Mechanics
 * 
 * Handles erasing original text and rendering new text in its place.
 */

import type { BoundingBox, TextStyle } from '@core/types';
import { EDIT_CONFIG } from '@core/constants';
import { createLogger } from '@utils/logger';
import { performanceMonitor } from '@utils/performance';

const logger = createLogger('TextEraser');

export class TextEraser {
  private erasureCanvas: HTMLCanvasElement;
  private erasureContext: CanvasRenderingContext2D;
  private erasedRegions: Map<string, BoundingBox> = new Map();

  constructor() {
    this.erasureCanvas = document.createElement('canvas');
    const ctx = this.erasureCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create erasure canvas context');
    }
    this.erasureContext = ctx;
  }

  /**
   * Initialize the erasure canvas to match a source canvas
   */
  initialize(width: number, height: number): void {
    this.erasureCanvas.width = width;
    this.erasureCanvas.height = height;
    this.erasureContext.clearRect(0, 0, width, height);
    this.erasedRegions.clear();
    logger.debug(`Erasure canvas initialized: ${width}x${height}`);
  }

  /**
   * Erase text at a specific region
   */
  eraseText(
    editId: string,
    bbox: BoundingBox,
    bgColor: string,
    padding: number = EDIT_CONFIG.TEXT_BLOCK_PADDING
  ): void {
    const stopMeasure = performanceMonitor.startMeasure('text-erase');

    // Expand the bounding box with padding
    const x = Math.max(0, bbox.x - padding);
    const y = Math.max(0, bbox.y - padding);
    const width = bbox.width + padding * 2;
    const height = bbox.height + padding * 2;

    // Fill with background color
    this.erasureContext.fillStyle = bgColor;
    this.erasureContext.fillRect(x, y, width, height);

    // Apply soft edges
    this.applySoftEdges(x, y, width, height, bgColor);

    // Track erased region
    this.erasedRegions.set(editId, { x, y, width, height });

    stopMeasure();
    logger.debug(`Text erased at (${x}, ${y}) with size ${width}x${height}`);
  }

  /**
   * Apply soft edges to erased region for better blending
   */
  private applySoftEdges(
    x: number,
    y: number,
    width: number,
    height: number,
    bgColor: string
  ): void {
    const blurRadius = EDIT_CONFIG.MASK_BLUR_RADIUS;

    // Create gradient edges
    const gradient = this.erasureContext.createLinearGradient(x, y, x + blurRadius, y);

    // Parse background color
    const [r, g, b] = this.parseColor(bgColor);

    // Left edge gradient
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 1)`);

    this.erasureContext.fillStyle = gradient;
    this.erasureContext.fillRect(x, y, blurRadius, height);

    // Right edge gradient
    const rightGradient = this.erasureContext.createLinearGradient(
      x + width - blurRadius,
      y,
      x + width,
      y
    );
    rightGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
    rightGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    this.erasureContext.fillStyle = rightGradient;
    this.erasureContext.fillRect(x + width - blurRadius, y, blurRadius, height);
  }

  /**
   * Render new text over the erased region
   */
  renderText(
    text: string,
    x: number,
    y: number,
    style: TextStyle
  ): void {
    const stopMeasure = performanceMonitor.startMeasure('text-render');

    // Set font properties
    this.erasureContext.font = this.buildFontString(style);
    this.erasureContext.fillStyle = style.color;
    this.erasureContext.textBaseline = 'top';

    // Render the text
    this.erasureContext.fillText(text, x, y);

    stopMeasure();
    logger.debug(`Text rendered: "${text.substring(0, 20)}..." at (${x}, ${y})`);
  }

  /**
   * Measure text dimensions
   */
  measureText(text: string, style: TextStyle): { width: number; height: number } {
    this.erasureContext.font = this.buildFontString(style);
    const metrics = this.erasureContext.measureText(text);

    return {
      width: metrics.width,
      height: style.fontSize * (style.lineHeight || 1.2),
    };
  }

  /**
   * Check if new text fits within original bounds
   */
  checkOverflow(
    text: string,
    style: TextStyle,
    maxWidth: number
  ): { fits: boolean; overflow: number } {
    const { width } = this.measureText(text, style);
    const overflow = width - maxWidth;

    return {
      fits: overflow <= 0,
      overflow: Math.max(0, overflow),
    };
  }

  /**
   * Truncate text with ellipsis to fit width
   */
  truncateText(text: string, style: TextStyle, maxWidth: number): string {
    const ellipsis = EDIT_CONFIG.OVERFLOW_ELLIPSIS;
    const { width: ellipsisWidth } = this.measureText(ellipsis, style);
    const targetWidth = maxWidth - ellipsisWidth;

    if (targetWidth <= 0) return ellipsis;

    let truncated = text;
    while (truncated.length > 0) {
      const { width } = this.measureText(truncated, style);
      if (width <= targetWidth) {
        return truncated + ellipsis;
      }
      truncated = truncated.slice(0, -1);
    }

    return ellipsis;
  }

  /**
   * Composite erasure canvas with original canvas
   */
  composite(originalCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const result = document.createElement('canvas');
    result.width = originalCanvas.width;
    result.height = originalCanvas.height;

    const ctx = result.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create composite canvas context');
    }

    // Draw original first
    ctx.drawImage(originalCanvas, 0, 0);

    // Draw erasure layer on top
    ctx.drawImage(this.erasureCanvas, 0, 0);

    return result;
  }

  /**
   * Get the erasure canvas
   */
  getErasureCanvas(): HTMLCanvasElement {
    return this.erasureCanvas;
  }

  /**
   * Get the erasure context
   */
  getErasureContext(): CanvasRenderingContext2D {
    return this.erasureContext;
  }

  /**
   * Get erased regions
   */
  getErasedRegions(): Map<string, BoundingBox> {
    return new Map(this.erasedRegions);
  }

  /**
   * Undo an erasure
   */
  undoErasure(editId: string, originalCanvas: HTMLCanvasElement): void {
    const region = this.erasedRegions.get(editId);
    if (!region) return;

    const originalCtx = originalCanvas.getContext('2d');
    if (!originalCtx) return;

    // Copy original region back to erasure canvas
    const imageData = originalCtx.getImageData(
      region.x,
      region.y,
      region.width,
      region.height
    );
    this.erasureContext.putImageData(imageData, region.x, region.y);

    this.erasedRegions.delete(editId);
    logger.debug(`Erasure undone for edit: ${editId}`);
  }

  /**
   * Clear all erasures
   */
  clear(): void {
    this.erasureContext.clearRect(
      0,
      0,
      this.erasureCanvas.width,
      this.erasureCanvas.height
    );
    this.erasedRegions.clear();
    logger.debug('All erasures cleared');
  }

  /**
   * Build CSS font string from TextStyle
   */
  private buildFontString(style: TextStyle): string {
    const weight = style.fontWeight === 'bold' ? 'bold' : 'normal';
    const fontStyle = style.fontStyle === 'italic' ? 'italic' : 'normal';
    return `${fontStyle} ${weight} ${style.fontSize}px ${style.fontFamily}`;
  }

  /**
   * Parse color string to RGB components
   */
  private parseColor(color: string): [number, number, number] {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return [r, g, b];
    }

    // Handle rgb/rgba colors
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    // Default to white
    return [255, 255, 255];
  }
}

// Export singleton instance
let textEraserInstance: TextEraser | null = null;

export function getTextEraser(): TextEraser {
  if (!textEraserInstance) {
    textEraserInstance = new TextEraser();
  }
  return textEraserInstance;
}
