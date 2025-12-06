/**
 * StyleDetector - Automatic Text Style Detection
 * 
 * Detects font, size, color, and other style attributes from rendered text.
 */

import type { TextStyle, CharBox, StyleConfidence } from '@core/types';
import { STYLE_DETECTION, DEFAULTS } from '@core/constants';
import { rgbToHex } from '@utils/helpers';
import { createLogger } from '@utils/logger';
import { performanceMonitor } from '@utils/performance';

const logger = createLogger('StyleDetector');

interface ColorSample {
  r: number;
  g: number;
  b: number;
  count: number;
}

export class StyleDetector {
  /**
   * Detect style from a canvas at a specific bounding box
   */
  async detectStyle(
    canvas: HTMLCanvasElement,
    bbox: CharBox
  ): Promise<{ style: TextStyle; confidence: StyleConfidence }> {
    const stopMeasure = performanceMonitor.startMeasure('style-detect');

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Cannot get canvas context');
      }

      // Get image data from bounding box (with some padding)
      const padding = 2;
      const x = Math.max(0, Math.floor(bbox.x - padding));
      const y = Math.max(0, Math.floor(bbox.y - padding));
      const width = Math.min(canvas.width - x, Math.ceil(bbox.width + padding * 2));
      const height = Math.min(canvas.height - y, Math.ceil(bbox.height + padding * 2));

      const imageData = ctx.getImageData(x, y, width, height);

      // Detect various style attributes
      const color = this.detectColor(imageData);
      const fontSize = this.detectFontSize(bbox);
      const fontFamily = this.detectFontFamily(imageData, bbox);
      const isBold = this.detectBold(imageData);
      const isItalic = this.detectItalic(bbox);

      const style: TextStyle = {
        fontFamily,
        fontSize,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        textDecoration: 'none',
        color,
        backgroundColor: 'transparent',
        lineHeight: 1.2,
      };

      const confidence: StyleConfidence = {
        font: fontFamily === DEFAULTS.TEXT_STYLE.fontFamily ? 0.5 : 0.8,
        size: 0.9, // Font size from bbox is usually accurate
        color: 0.85,
        overall: 0.85,
      };

      stopMeasure();

      logger.debug('Style detected', { style, confidence });

      return { style, confidence };
    } catch (error) {
      logger.error('Style detection failed', error);
      return {
        style: { ...DEFAULTS.TEXT_STYLE },
        confidence: { font: 0, size: 0, color: 0, overall: 0 },
      };
    }
  }

  /**
   * Detect text color from image data
   */
  detectColor(imageData: ImageData): string {
    const data = imageData.data;
    const colorSamples: ColorSample[] = [];

    // Sample pixels and find non-white colors (likely text)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent or nearly white pixels
      if (a < 128) continue;
      if (r > 240 && g > 240 && b > 240) continue;

      // Check if this color is already sampled (with tolerance)
      let found = false;
      for (const sample of colorSamples) {
        if (
          Math.abs(sample.r - r) < 10 &&
          Math.abs(sample.g - g) < 10 &&
          Math.abs(sample.b - b) < 10
        ) {
          sample.count++;
          found = true;
          break;
        }
      }

      if (!found) {
        colorSamples.push({ r, g, b, count: 1 });
      }
    }

    // Find the most frequent color
    if (colorSamples.length === 0) {
      return DEFAULTS.TEXT_STYLE.color;
    }

    colorSamples.sort((a, b) => b.count - a.count);
    const dominantColor = colorSamples[0];

    return rgbToHex(dominantColor.r, dominantColor.g, dominantColor.b);
  }

  /**
   * Detect font size from character bounding box
   */
  detectFontSize(bbox: CharBox): number {
    // Font size is approximately the height of the bounding box
    // Apply some correction factor for typical font metrics
    const fontSize = Math.round(bbox.height * 0.9);
    return Math.max(1, Math.min(fontSize, 500));
  }

  /**
   * Detect font family (serif vs sans-serif)
   */
  detectFontFamily(imageData: ImageData, bbox: CharBox): string {
    // Use font name from bbox if available
    if (bbox.fontName) {
      const fontName = bbox.fontName.toLowerCase();
      if (/times|georgia|serif|palatino|garamond/i.test(fontName) && !/sans/i.test(fontName)) {
        return 'Times New Roman, serif';
      }
      if (/arial|helvetica|verdana|sans/i.test(fontName)) {
        return 'Arial, sans-serif';
      }
      if (/courier|mono|consolas/i.test(fontName)) {
        return 'Courier New, monospace';
      }
    }

    // Fallback to pixel analysis for serif detection
    const hasSerifs = this.detectSerifs(imageData);
    return hasSerifs ? 'Times New Roman, serif' : 'Arial, sans-serif';
  }

  /**
   * Detect if text is bold based on stroke width
   */
  detectBold(imageData: ImageData): boolean {
    const data = imageData.data;
    let darkPixelCount = 0;
    let totalPixels = 0;

    // Count dark pixels (text) vs light pixels (background)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue;
      totalPixels++;

      // Check if pixel is dark (likely text)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 128) {
        darkPixelCount++;
      }
    }

    if (totalPixels === 0) return false;

    // Bold text has higher pixel density
    const density = darkPixelCount / totalPixels;
    return density > STYLE_DETECTION.BOLD_DENSITY_THRESHOLD;
  }

  /**
   * Detect if text is italic based on character slant
   */
  detectItalic(bbox: CharBox): boolean {
    // Italic detection from bbox is limited
    // Would need more sophisticated analysis
    // For now, check if font name suggests italic
    if (bbox.fontName) {
      return /italic|oblique/i.test(bbox.fontName);
    }
    return false;
  }

  /**
   * Detect serif presence in text
   */
  private detectSerifs(imageData: ImageData): boolean {
    // Simplified serif detection based on horizontal strokes at edges
    // Real implementation would use more sophisticated edge detection
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    if (width < 10 || height < 10) {
      return false; // Too small to analyze
    }

    // Check bottom row for horizontal stroke (potential serif)
    let bottomDarkPixels = 0;
    const bottomRow = (height - 1) * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = bottomRow + x * 4;
      const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (luminance < 128 && data[idx + 3] > 128) {
        bottomDarkPixels++;
      }
    }

    // Check top row
    let topDarkPixels = 0;
    for (let x = 0; x < width; x++) {
      const idx = x * 4;
      const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (luminance < 128 && data[idx + 3] > 128) {
        topDarkPixels++;
      }
    }

    // Serifs typically create wider strokes at top/bottom
    const serifRatio = (topDarkPixels + bottomDarkPixels) / (2 * width);
    return serifRatio > STYLE_DETECTION.SERIF_DETECTION_THRESHOLD;
  }

  /**
   * Match detected style to web-safe font
   */
  getFallbackFont(primaryFont: string): string {
    const fontLower = primaryFont.toLowerCase();

    // Serif fonts
    if (/times|georgia|palatino|garamond|baskerville/i.test(fontLower)) {
      return 'Times New Roman, Times, serif';
    }

    // Sans-serif fonts
    if (/arial|helvetica|verdana|tahoma|trebuchet/i.test(fontLower)) {
      return 'Arial, Helvetica, sans-serif';
    }

    // Monospace fonts
    if (/courier|monaco|consolas|lucida console/i.test(fontLower)) {
      return 'Courier New, Courier, monospace';
    }

    // Default fallback
    return STYLE_DETECTION.DEFAULT_FONT_FAMILY;
  }

  /**
   * Apply style to an HTML element
   */
  applyStyleToElement(element: HTMLElement, style: TextStyle): void {
    element.style.fontFamily = style.fontFamily;
    element.style.fontSize = `${style.fontSize}px`;
    element.style.fontWeight = String(style.fontWeight);
    element.style.fontStyle = style.fontStyle;
    element.style.textDecoration = style.textDecoration;
    element.style.color = style.color;
    element.style.lineHeight = String(style.lineHeight);

    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      element.style.backgroundColor = style.backgroundColor;
    }
  }
}

// Export singleton instance
let styleDetectorInstance: StyleDetector | null = null;

export function getStyleDetector(): StyleDetector {
  if (!styleDetectorInstance) {
    styleDetectorInstance = new StyleDetector();
  }
  return styleDetectorInstance;
}
