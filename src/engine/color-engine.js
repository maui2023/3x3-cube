/**
 * Adaptive Color Classifier Engine
 * Converts raw RGB frame pixels into CIELAB color space (L*, a*, b*).
 * Implements Dynamic Center Calibration: uses the center stickers (index 4 of U, R, F, D, L, B)
 * as dynamic reference centroids to adapt to warm/cool room lighting and camera white balance.
 * Uses Euclidean Delta-E distance to classify sticker colors.
 */

// Singmaster face order and invariant center sticker colors
export const FACE_TO_COLOR = Object.freeze({
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
});

export const COLOR_TO_FACE = Object.freeze({
  white: 'U',
  red: 'R',
  green: 'F',
  yellow: 'D',
  orange: 'L',
  blue: 'B',
});

export const ALL_COLORS = Object.freeze(['white', 'red', 'green', 'yellow', 'orange', 'blue']);

// Default baseline reference RGB values under neutral D65 lighting
export const DEFAULT_REFERENCE_RGB = Object.freeze({
  white: [255, 255, 255],
  red: [220, 20, 20],
  green: [0, 150, 60],
  yellow: [255, 215, 0],
  orange: [255, 120, 0],
  blue: [0, 80, 200],
});

/**
 * Converts sRGB [0..255] to linear RGB [0..1]
 * @param {number} c
 * @returns {number}
 */
function sRgbToLinear(c) {
  const v = Math.min(255, Math.max(0, c)) / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Converts RGB [0..255] to CIE 1931 XYZ (D65 standard illuminant, 2° observer)
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]} [X, Y, Z]
 */
export function rgbToXyz(r, g, b) {
  const lr = sRgbToLinear(r);
  const lg = sRgbToLinear(g);
  const lb = sRgbToLinear(b);

  const x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
  const z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;

  return [x, y, z];
}

/**
 * Converts CIE XYZ to CIELAB (L*, a*, b*)
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {[number, number, number]} [L, a, b]
 */
export function xyzToLab(x, y, z) {
  // D65 reference white points
  const Xn = 0.95047;
  const Yn = 1.00000;
  const Zn = 1.08883;

  const f = (t) => {
    // 0.008856451679 = (6/29)^3
    return t > 0.008856451679 ? Math.cbrt(t) : 7.787037 * t + 16 / 116;
  };

  const fx = f(x / Xn);
  const fy = f(y / Yn);
  const fz = f(z / Zn);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return [L, a, b];
}

/**
 * Converts standard sRGB to CIELAB space
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]} [L, a, b]
 */
export function rgbToLab(r, g, b) {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/**
 * Calculates Euclidean Delta-E distance between two CIELAB colors:
 * ΔE = sqrt((ΔL*)^2 + (Δa*)^2 + (Δb*)^2)
 *
 * @param {[number, number, number]} lab1
 * @param {[number, number, number]} lab2
 * @returns {number}
 */
export function deltaE(lab1, lab2) {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Adaptive Color Classifier Engine
 */
export class ColorEngine {
  constructor() {
    this.calibratedCentroids = {};
    this.resetCalibration();
  }

  /**
   * Resets color centroids to default baseline RGB profiles
   */
  resetCalibration() {
    this.calibratedCentroids = {};
    for (const color of ALL_COLORS) {
      const rgb = DEFAULT_REFERENCE_RGB[color];
      this.calibratedCentroids[color] = {
        rgb: [...rgb],
        lab: rgbToLab(...rgb),
        isDynamic: false,
      };
    }
  }

  /**
   * Recalibrates reference profiles using dynamic center sticker observations.
   * Accepts either:
   * 1. A map of FaceId -> RGB: { U: [r,g,b], R: [r,g,b], ... }
   * 2. A map of color name -> RGB: { white: [r,g,b], red: [r,g,b], ... }
   * 3. A cube capture map where face values are 9-element arrays of RGBs (extracts index 4)
   *
   * @param {Record<string, [number, number, number] | Array<[number, number, number]>>} centers
   */
  calibrateCenters(centers) {
    if (!centers || typeof centers !== 'object') return;

    for (const [key, value] of Object.entries(centers)) {
      let rgb = null;
      let targetColor = null;

      // Extract RGB: if array of 9 stickers, index 4 is the center
      if (Array.isArray(value)) {
        if (value.length === 9 && Array.isArray(value[4])) {
          rgb = value[4];
        } else if (value.length >= 3 && typeof value[0] === 'number') {
          rgb = value;
        }
      }

      if (!rgb || rgb.length < 3) continue;

      // Map key to color: can be face ID ('U') or color name ('white')
      const upperKey = key.toUpperCase();
      if (FACE_TO_COLOR[upperKey]) {
        targetColor = FACE_TO_COLOR[upperKey];
      } else {
        const lowerKey = key.toLowerCase();
        if (ALL_COLORS.includes(lowerKey)) {
          targetColor = lowerKey;
        }
      }

      if (targetColor) {
        this.calibratedCentroids[targetColor] = {
          rgb: [rgb[0], rgb[1], rgb[2]],
          lab: rgbToLab(rgb[0], rgb[1], rgb[2]),
          isDynamic: true,
        };
      }
    }
  }

  /**
   * Classifies a single RGB pixel sample into one of the 6 cube colors.
   * Uses Euclidean Delta-E against the calibrated (or default) centroids.
   *
   * @param {[number, number, number]} rgb [r, g, b]
   * @returns {string} One of 'white' | 'red' | 'green' | 'yellow' | 'orange' | 'blue'
   */
  classifyColor(rgb) {
    const details = this.classifyColorDetails(rgb);
    return details.color;
  }

  /**
   * Alias for classifyColor
   * @param {[number, number, number]} rgb
   */
  classifyRgb(rgb) {
    return this.classifyColor(rgb);
  }

  /**
   * Classifies an RGB pixel sample and returns detailed distance metrics.
   *
   * @param {[number, number, number]} rgb [r, g, b]
   * @returns {{ color: string, distance: number, lab: [number, number, number] }}
   */
  classifyColorDetails(rgb) {
    const sampleLab = rgbToLab(rgb[0], rgb[1], rgb[2]);
    let bestColor = 'white';
    let minDistance = Infinity;

    for (const color of ALL_COLORS) {
      const centroidLab = this.calibratedCentroids[color].lab;
      const dist = deltaE(sampleLab, centroidLab);
      if (dist < minDistance) {
        minDistance = dist;
        bestColor = color;
      }
    }

    return {
      color: bestColor,
      distance: minDistance,
      lab: sampleLab,
    };
  }

  /**
   * Classifies an array of 9 RGB values corresponding to a face
   * @param {Array<[number, number, number]>} rgbSamples
   * @returns {string[]} Array of 9 color names
   */
  classifyFace(rgbSamples) {
    if (!Array.isArray(rgbSamples) || rgbSamples.length !== 9) {
      throw new Error(`Expected 9 RGB sticker samples, received ${rgbSamples?.length}`);
    }
    return rgbSamples.map((rgb) => this.classifyColor(rgb));
  }

  /**
   * Samples 9 sticker regions from a video frame or canvas within the viewfinder rectangle.
   * Computes a patch average around each of the 3x3 grid centers to reject sensor noise.
   *
   * @param {HTMLVideoElement | HTMLCanvasElement} sourceEl
   * @param {{ x: number, y: number, size: number }} viewfinderRect
   * @returns {Promise<string[]>} Array of 9 classified colors
   */
  async sampleFace(sourceEl, viewfinderRect) {
    // In headless or test environments where canvas is unavailable:
    let canvas;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
    } else {
      throw new Error('sampleFace requires a DOM Canvas environment');
    }

    const { x, y, size } = viewfinderRect;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw region to canvas
    ctx.drawImage(sourceEl, x, y, size, size, 0, 0, size, size);

    const cell = size / 3;
    const patchRadius = Math.max(2, Math.floor(cell * 0.1)); // Average patch around center
    const samplesRgb = [];

    for (let ry = 0; ry < 3; ry++) {
      for (let rx = 0; rx < 3; rx++) {
        const cx = Math.floor(rx * cell + cell / 2);
        const cy = Math.floor(ry * cell + cell / 2);

        // Average surrounding patch
        const pData = ctx.getImageData(
          Math.max(0, cx - patchRadius),
          Math.max(0, cy - patchRadius),
          patchRadius * 2 + 1,
          patchRadius * 2 + 1
        ).data;

        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (let i = 0; i < pData.length; i += 4) {
          sumR += pData[i];
          sumG += pData[i + 1];
          sumB += pData[i + 2];
          count++;
        }

        const avgR = Math.round(sumR / count);
        const avgG = Math.round(sumG / count);
        const avgB = Math.round(sumB / count);
        samplesRgb.push([avgR, avgG, avgB]);
      }
    }

    return this.classifyFace(samplesRgb);
  }
}

// Default singleton instance
export const colorEngine = new ColorEngine();
