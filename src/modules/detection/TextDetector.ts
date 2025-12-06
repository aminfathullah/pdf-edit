/**
 * TextDetector - Extract Text from PDF Documents
 * 
 * Extracts text content and positions from digital PDF text layers.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextBlock, CharBox, TextStyle } from '@core/types';
import { DEFAULTS, EVENTS } from '@core/constants';
import { generateId } from '@utils/helpers';
import { eventBus } from '@utils/EventBus';
import { createLogger } from '@utils/logger';
import { performanceMonitor } from '@utils/performance';

const logger = createLogger('TextDetector');

interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

export class TextDetector {
  private pdf: PDFDocumentProxy | null = null;
  private textBlocksCache: Map<number, TextBlock[]> = new Map();

  /**
   * Set the PDF document to extract text from
   */
  setPDF(pdf: PDFDocumentProxy): void {
    this.pdf = pdf;
    this.textBlocksCache.clear();
    logger.info('PDF document set for text detection');
  }

  /**
   * Extract text blocks from a specific page
   */
  async extractText(pageNum: number): Promise<TextBlock[]> {
    if (!this.pdf) {
      throw new Error('No PDF document set');
    }

    // Check cache
    const cached = this.textBlocksCache.get(pageNum);
    if (cached) {
      logger.debug(`Returning cached text blocks for page ${pageNum}`);
      return cached;
    }

    const stopMeasure = performanceMonitor.startMeasure(`text-extract-page-${pageNum}`);

    try {
      const page = await this.pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const textBlocks: TextBlock[] = [];
      let currentBlock: TextBlock | null = null;
      let lastY = -1;
      const lineThreshold = 5; // Pixels to determine same line

      for (const item of textContent.items) {
        if (!('str' in item) || !item.str.trim()) continue;

        const textItem = item as TextItem;
        const [, , , , tx, ty] = textItem.transform;

        // Transform Y coordinate (PDF uses bottom-left origin)
        const y = viewport.height - ty;
        const x = tx;
        const width = textItem.width;
        const height = textItem.height || 12;

        // Check if this is a new line/block
        const isNewLine = Math.abs(y - lastY) > lineThreshold;

        if (isNewLine && currentBlock) {
          textBlocks.push(currentBlock);
          currentBlock = null;
        }

        // Create character boxes
        const charBoxes = this.createCharBoxes(textItem.str, x, y, width, height, textItem.fontName);

        if (!currentBlock) {
          // Start a new block
          currentBlock = {
            id: generateId('block'),
            text: textItem.str,
            boxes: charBoxes,
            style: this.extractStyle(textItem, height),
            source: 'digital',
            confidence: 1.0,
            x,
            y,
            width,
            height,
            pageNumber: pageNum,
          };
        } else {
          // Append to existing block
          currentBlock.text += textItem.str;
          currentBlock.boxes.push(...charBoxes);
          currentBlock.width = Math.max(currentBlock.width, x + width - currentBlock.x);
        }

        lastY = y;
      }

      // Add the last block
      if (currentBlock) {
        textBlocks.push(currentBlock);
      }

      // Cache the results
      this.textBlocksCache.set(pageNum, textBlocks);

      const extractTime = stopMeasure();
      logger.info(`Extracted ${textBlocks.length} text blocks from page ${pageNum} in ${extractTime.toFixed(2)}ms`);

      // Emit event
      eventBus.publish(EVENTS.TEXT_DETECTED, {
        pageNumber: pageNum,
        blocks: textBlocks,
      });

      return textBlocks;
    } catch (error) {
      logger.error(`Failed to extract text from page ${pageNum}`, error);
      throw error;
    }
  }

  /**
   * Find text block at a specific position
   */
  findBlockAtPosition(
    pageNum: number,
    x: number,
    y: number
  ): TextBlock | null {
    const blocks = this.textBlocksCache.get(pageNum);
    if (!blocks) return null;

    // Find block that contains the point
    for (const block of blocks) {
      if (
        x >= block.x &&
        x <= block.x + block.width &&
        y >= block.y &&
        y <= block.y + block.height
      ) {
        return block;
      }
    }

    return null;
  }

  /**
   * Find character at a specific position
   */
  findCharAtPosition(
    pageNum: number,
    x: number,
    y: number
  ): { block: TextBlock; charBox: CharBox } | null {
    const block = this.findBlockAtPosition(pageNum, x, y);
    if (!block) return null;

    for (const charBox of block.boxes) {
      if (
        x >= charBox.x &&
        x <= charBox.x + charBox.width &&
        y >= charBox.y &&
        y <= charBox.y + charBox.height
      ) {
        return { block, charBox };
      }
    }

    return null;
  }

  /**
   * Get all text blocks for a page
   */
  getTextBlocks(pageNum: number): TextBlock[] {
    return this.textBlocksCache.get(pageNum) || [];
  }

  /**
   * Get full text content for a page
   */
  async getPageText(pageNum: number): Promise<string> {
    const blocks = await this.extractText(pageNum);
    return blocks.map((b) => b.text).join(' ');
  }

  /**
   * Search for text across all pages
   */
  async searchText(query: string): Promise<Array<{ pageNum: number; blocks: TextBlock[] }>> {
    if (!this.pdf) {
      throw new Error('No PDF document set');
    }

    const results: Array<{ pageNum: number; blocks: TextBlock[] }> = [];
    const lowerQuery = query.toLowerCase();

    for (let pageNum = 1; pageNum <= this.pdf.numPages; pageNum++) {
      const blocks = await this.extractText(pageNum);
      const matchingBlocks = blocks.filter((b) =>
        b.text.toLowerCase().includes(lowerQuery)
      );

      if (matchingBlocks.length > 0) {
        results.push({ pageNum, blocks: matchingBlocks });
      }
    }

    return results;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.textBlocksCache.clear();
    logger.debug('Text detection cache cleared');
  }

  /**
   * Create character bounding boxes
   */
  private createCharBoxes(
    text: string,
    startX: number,
    y: number,
    totalWidth: number,
    height: number,
    fontName: string
  ): CharBox[] {
    const boxes: CharBox[] = [];
    const charWidth = text.length > 0 ? totalWidth / text.length : 0;

    let x = startX;
    for (let i = 0; i < text.length; i++) {
      boxes.push({
        char: text[i],
        index: i,
        x,
        y,
        width: charWidth,
        height,
        baseline: y + height * 0.8, // Approximate baseline
        fontName,
        fontSize: height,
      });
      x += charWidth;
    }

    return boxes;
  }

  /**
   * Extract style information from text item
   */
  private extractStyle(textItem: TextItem, height: number): TextStyle {
    // Extract font info from fontName (e.g., "g_d0_f1" or actual font names)
    const fontName = textItem.fontName || '';
    const isBold = /bold/i.test(fontName);
    const isItalic = /italic|oblique/i.test(fontName);
    const isSerif = /serif|times|georgia/i.test(fontName) && !/sans/i.test(fontName);

    return {
      fontFamily: isSerif ? 'serif' : 'sans-serif',
      fontSize: Math.round(height),
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textDecoration: 'none',
      color: DEFAULTS.TEXT_STYLE.color,
      backgroundColor: 'transparent',
      lineHeight: 1.2,
    };
  }
}

// Export singleton instance
let textDetectorInstance: TextDetector | null = null;

export function getTextDetector(): TextDetector {
  if (!textDetectorInstance) {
    textDetectorInstance = new TextDetector();
  }
  return textDetectorInstance;
}
