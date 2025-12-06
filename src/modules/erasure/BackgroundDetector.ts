/**
 * BackgroundDetector - Intelligent Background Color Detection
 * 
 * Analyzes the area around text to determine the background color for erasure.
 */

import type { Background, BackgroundType, BoundingBox } from '@core/types';
import { DEFAULTS } from '@core/constants';
import { rgbToHex, colorDistance } from '@utils/helpers';
import { createLogger } from '@utils/logger';
import { performanceMonitor } from '@utils/performance';

const logger = createLogger('BackgroundDetector');

interface ColorCluster {
  r: number;
  g: number;
  b: number;
  count: number;
}

export class BackgroundDetector {
  /**
   * Detect background color around a text bounding box
   */
  async detectBackground(
    canvas: HTMLCanvasElement,
    bbox: BoundingBox,
    padding: number = 5
  ): Promise<Background> {
    const stopMeasure = performanceMonitor.startMeasure('bg-detect');

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Cannot get canvas context');
      }

      // Sample areas around the bounding box (not inside it)
      const samples = this.sampleAroundBox(ctx, canvas.width, canvas.height, bbox, padding);

      if (samples.length === 0) {
        return { ...DEFAULTS.BACKGROUND };
      }

      // Cluster colors to find dominant background
      const clusters = this.clusterColors(samples);
      const dominantCluster = clusters.reduce((a, b) => (a.count > b.count ? a : b));

      // Determine background type
      const type = this.determineBackgroundType(clusters);

      // Calculate confidence
      const confidence = dominantCluster.count / samples.length;

      const background: Background = {
        color: rgbToHex(
          Math.round(dominantCluster.r),
          Math.round(dominantCluster.g),
          Math.round(dominantCluster.b)
        ),
        type,
        confidence,
      };

      stopMeasure();
      logger.debug('Background detected', background);

      return background;
    } catch (error) {
      logger.error('Background detection failed', error);
      return { ...DEFAULTS.BACKGROUND };
    }
  }

  /**
   * Sample pixels from areas around the bounding box
   */
  private sampleAroundBox(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    bbox: BoundingBox,
    padding: number
  ): Array<{ r: number; g: number; b: number }> {
    const samples: Array<{ r: number; g: number; b: number }> = [];

    // Define sample regions (top, bottom, left, right of bbox)
    const regions = [
      // Top region
      {
        x: Math.max(0, bbox.x - padding),
        y: Math.max(0, bbox.y - padding - 5),
        w: bbox.width + padding * 2,
        h: 5,
      },
      // Bottom region
      {
        x: Math.max(0, bbox.x - padding),
        y: Math.min(canvasHeight - 5, bbox.y + bbox.height + padding),
        w: bbox.width + padding * 2,
        h: 5,
      },
      // Left region
      {
        x: Math.max(0, bbox.x - padding - 5),
        y: bbox.y,
        w: 5,
        h: bbox.height,
      },
      // Right region
      {
        x: Math.min(canvasWidth - 5, bbox.x + bbox.width + padding),
        y: bbox.y,
        w: 5,
        h: bbox.height,
      },
    ];

    for (const region of regions) {
      if (region.w <= 0 || region.h <= 0) continue;
      if (region.x < 0 || region.y < 0) continue;
      if (region.x + region.w > canvasWidth || region.y + region.h > canvasHeight) continue;

      try {
        const imageData = ctx.getImageData(
          Math.floor(region.x),
          Math.floor(region.y),
          Math.floor(region.w),
          Math.floor(region.h)
        );

        const data = imageData.data;
        const sampleRate = Math.max(1, Math.floor(data.length / 4 / 50)); // Sample ~50 pixels per region

        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          samples.push({ r, g, b });
        }
      } catch {
        // Skip invalid regions
        continue;
      }
    }

    return samples;
  }

  /**
   * Cluster colors to find dominant colors
   */
  private clusterColors(
    samples: Array<{ r: number; g: number; b: number }>
  ): ColorCluster[] {
    const clusters: ColorCluster[] = [];
    const tolerance = 30; // Color distance tolerance for clustering

    for (const sample of samples) {
      let foundCluster = false;

      for (const cluster of clusters) {
        const distance = colorDistance(sample, cluster);
        if (distance < tolerance) {
          // Add to existing cluster (running average)
          cluster.r = (cluster.r * cluster.count + sample.r) / (cluster.count + 1);
          cluster.g = (cluster.g * cluster.count + sample.g) / (cluster.count + 1);
          cluster.b = (cluster.b * cluster.count + sample.b) / (cluster.count + 1);
          cluster.count++;
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push({
          r: sample.r,
          g: sample.g,
          b: sample.b,
          count: 1,
        });
      }
    }

    return clusters.sort((a, b) => b.count - a.count);
  }

  /**
   * Determine background type from color clusters
   */
  private determineBackgroundType(clusters: ColorCluster[]): BackgroundType {
    if (clusters.length <= 1) {
      return 'solid';
    }

    // If top cluster dominates (>70%), it's likely solid
    const totalCount = clusters.reduce((sum, c) => sum + c.count, 0);
    const dominantRatio = clusters[0].count / totalCount;

    if (dominantRatio > 0.7) {
      return 'solid';
    }

    // If there are 2-3 main colors, might be gradient
    if (clusters.length <= 3 && dominantRatio > 0.4) {
      // Check if colors form a gradient (similar hue, varying brightness)
      const isGradient = this.checkGradient(clusters.slice(0, 3));
      if (isGradient) {
        return 'gradient';
      }
    }

    // Many distinct colors suggest pattern or image
    if (clusters.length > 5) {
      return 'image';
    }

    return 'pattern';
  }

  /**
   * Check if colors form a gradient
   */
  private checkGradient(clusters: ColorCluster[]): boolean {
    if (clusters.length < 2) return false;

    // Check if colors have similar hue but different brightness
    for (let i = 1; i < clusters.length; i++) {
      const c1 = clusters[i - 1];
      const c2 = clusters[i];

      // Calculate brightness
      const b1 = (c1.r + c1.g + c1.b) / 3;
      const b2 = (c2.r + c2.g + c2.b) / 3;

      // Calculate hue difference (simplified)
      const hueDiff = Math.abs(
        (c1.r - c1.b) / 255 - (c2.r - c2.b) / 255
      );

      // Gradient: similar hue, different brightness
      if (hueDiff > 0.3 || Math.abs(b1 - b2) < 20) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get a blended background color for complex backgrounds
   */
  getBlendedColor(
    canvas: HTMLCanvasElement,
    bbox: BoundingBox
  ): string {
    const ctx = canvas.getContext('2d');
    if (!ctx) return DEFAULTS.BACKGROUND.color;

    try {
      // Sample the entire bbox area
      const imageData = ctx.getImageData(
        Math.floor(bbox.x),
        Math.floor(bbox.y),
        Math.floor(bbox.width),
        Math.floor(bbox.height)
      );

      const data = imageData.data;
      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      // Sample edge pixels only (more likely to be background)
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % imageData.width;
        const y = Math.floor((i / 4) / imageData.width);

        // Check if edge pixel
        if (x === 0 || x === imageData.width - 1 || y === 0 || y === imageData.height - 1) {
          if (data[i + 3] > 128) {
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
            count++;
          }
        }
      }

      if (count === 0) return DEFAULTS.BACKGROUND.color;

      return rgbToHex(
        Math.round(rSum / count),
        Math.round(gSum / count),
        Math.round(bSum / count)
      );
    } catch {
      return DEFAULTS.BACKGROUND.color;
    }
  }
}

// Export singleton instance
let backgroundDetectorInstance: BackgroundDetector | null = null;

export function getBackgroundDetector(): BackgroundDetector {
  if (!backgroundDetectorInstance) {
    backgroundDetectorInstance = new BackgroundDetector();
  }
  return backgroundDetectorInstance;
}
