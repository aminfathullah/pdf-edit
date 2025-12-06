/**
 * ReflowEngine - Text Reflow and Layout Management
 * 
 * Handles text reflow when edited text changes width.
 */

import type { TextStyle, BoundingBox, CharBox } from '@core/types';
import { createLogger } from '@utils/logger';
import { measureText } from '@utils/helpers';

const logger = createLogger('ReflowEngine');

export interface ReflowResult {
  fits: boolean;
  overflow: number;
  truncatedText?: string;
  lines?: string[];
  adjustedPosition?: { x: number; y: number };
}

export class ReflowEngine {
  /**
   * Calculate text width with given style
   */
  calculateTextWidth(text: string, style: TextStyle): number {
    return measureText(text, style.fontFamily, style.fontSize, String(style.fontWeight)).width;
  }

  /**
   * Get character advance widths
   */
  getCharAdvances(text: string, style: TextStyle): number[] {
    const advances: number[] = [];
    
    for (let i = 0; i < text.length; i++) {
      const charWidth = this.calculateTextWidth(text[i], style);
      advances.push(charWidth);
    }

    return advances;
  }

  /**
   * Check if text fits within bounds and calculate reflow
   */
  calculateReflow(
    originalText: string,
    newText: string,
    originalBounds: BoundingBox,
    style: TextStyle
  ): ReflowResult {
    const originalWidth = this.calculateTextWidth(originalText, style);
    const newWidth = this.calculateTextWidth(newText, style);
    const overflow = newWidth - originalBounds.width;

    logger.debug(`Reflow calculation: original=${originalWidth.toFixed(2)}, new=${newWidth.toFixed(2)}, overflow=${overflow.toFixed(2)}`);

    if (overflow <= 0) {
      // Text fits
      return {
        fits: true,
        overflow: 0,
      };
    }

    // Text doesn't fit - calculate truncation
    const truncatedText = this.truncateToFit(newText, originalBounds.width, style);

    return {
      fits: false,
      overflow,
      truncatedText,
    };
  }

  /**
   * Truncate text to fit within width
   */
  truncateToFit(text: string, maxWidth: number, style: TextStyle): string {
    const ellipsis = '...';
    const ellipsisWidth = this.calculateTextWidth(ellipsis, style);
    const targetWidth = maxWidth - ellipsisWidth;

    if (targetWidth <= 0) {
      return ellipsis;
    }

    let truncated = text;
    let currentWidth = this.calculateTextWidth(truncated, style);

    while (currentWidth > targetWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
      currentWidth = this.calculateTextWidth(truncated, style);
    }

    return truncated.trim() + ellipsis;
  }

  /**
   * Wrap text to multiple lines
   */
  wrapText(text: string, maxWidth: number, style: TextStyle): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = this.calculateTextWidth(testLine, style);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Calculate position adjustment for following text
   */
  calculateFollowingTextAdjustment(
    originalText: string,
    newText: string,
    style: TextStyle
  ): number {
    const originalWidth = this.calculateTextWidth(originalText, style);
    const newWidth = this.calculateTextWidth(newText, style);
    return newWidth - originalWidth;
  }

  /**
   * Adjust positions of following text blocks
   */
  adjustFollowingBlocks(
    blocks: CharBox[],
    startX: number,
    delta: number
  ): CharBox[] {
    return blocks.map((box) => {
      if (box.x > startX) {
        return {
          ...box,
          x: box.x + delta,
        };
      }
      return box;
    });
  }

  /**
   * Check if text needs reflow
   */
  needsReflow(
    _originalText: string,
    newText: string,
    bounds: BoundingBox,
    style: TextStyle
  ): boolean {
    const newWidth = this.calculateTextWidth(newText, style);
    return newWidth > bounds.width;
  }

  /**
   * Get optimal font size to fit text
   */
  getOptimalFontSize(
    text: string,
    maxWidth: number,
    style: TextStyle,
    minSize: number = 6,
    maxSize: number = 72
  ): number {
    let optimalSize = style.fontSize;
    
    // Binary search for optimal size
    let low = minSize;
    let high = Math.min(maxSize, style.fontSize);

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testStyle = { ...style, fontSize: mid };
      const width = this.calculateTextWidth(text, testStyle);

      if (width <= maxWidth) {
        optimalSize = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return optimalSize;
  }

  /**
   * Calculate line height for style
   */
  calculateLineHeight(style: TextStyle): number {
    return style.fontSize * (style.lineHeight || 1.2);
  }

  /**
   * Check if text contains ligatures
   */
  containsLigatures(text: string): boolean {
    const ligatures = ['fi', 'fl', 'ff', 'ffi', 'ffl', 'st'];
    return ligatures.some((lig) => text.includes(lig));
  }
}

// Export singleton instance
let reflowEngineInstance: ReflowEngine | null = null;

export function getReflowEngine(): ReflowEngine {
  if (!reflowEngineInstance) {
    reflowEngineInstance = new ReflowEngine();
  }
  return reflowEngineInstance;
}
