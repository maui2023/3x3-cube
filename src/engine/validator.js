/**
 * Cube State & Parity Validator
 *
 * Verifies that:
 * 1. All 54 stickers are assigned.
 * 2. Exact distribution count: exactly 9 stickers of each of the 6 colors.
 * 3. Center stickers invariant: U=White, R=Red, F=Green, D=Yellow, L=Orange, B=Blue (indices 4).
 * 4. Corner piece and edge piece composition are valid without impossible color combos or duplicates.
 * 5. Corner orientation parity (twist sum mod 3 == 0).
 * 6. Edge orientation parity (flip sum mod 2 == 0).
 * 7. Permutation parity (corner permutation sign == edge permutation sign).
 */

import { FACE_TO_COLOR, COLOR_TO_FACE } from './color-engine.js';

export const ORDERED_FACES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);

export const EXPECTED_CENTERS = Object.freeze({
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
});

// Singmaster 54-facelet corner indices (0..7)
// [U8, R0, F2], [U6, F0, L2], [U0, L0, B2], [U2, B0, R2],
// [D2, F8, R6], [D0, L8, F6], [D6, B8, L6], [D8, R8, B6]
const CORNER_FACELET_INDICES = [
  [8, 9, 20],   // 0: URF
  [6, 18, 38],  // 1: UFL
  [0, 36, 47],  // 2: ULB
  [2, 45, 11],  // 3: UBR
  [29, 26, 15], // 4: DFR
  [27, 44, 24], // 5: DLF
  [33, 53, 42], // 6: DBL
  [35, 17, 51], // 7: DRB
];

const STANDARD_CORNER_COLORS = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
];

// Singmaster 54-facelet edge indices (0..11)
// [U5, R1], [U7, F1], [U3, L1], [U1, B1],
// [D5, R7], [D1, F7], [D3, L7], [D7, B7],
// [F5, R3], [F3, L5], [B5, L3], [B3, R5]
const EDGE_FACELET_INDICES = [
  [5, 10],  // 0: UR
  [7, 19],  // 1: UF
  [3, 37],  // 2: UL
  [1, 46],  // 3: UB
  [32, 16], // 4: DR
  [28, 25], // 5: DF
  [30, 43], // 6: DL
  [34, 52], // 7: DB
  [23, 12], // 8: FR
  [21, 41], // 9: FL
  [50, 39], // 10: BL
  [48, 14], // 11: BR
];

const STANDARD_EDGE_COLORS = [
  ['U', 'R'],
  ['U', 'F'],
  ['U', 'L'],
  ['U', 'B'],
  ['D', 'R'],
  ['D', 'F'],
  ['D', 'L'],
  ['D', 'B'],
  ['F', 'R'],
  ['F', 'L'],
  ['B', 'L'],
  ['B', 'R'],
];

/**
 * Normalizes any color token ('white' or 'U') to its face ID ('U').
 * @param {string} token
 * @returns {string | null}
 */
export function normalizeToFaceId(token) {
  if (typeof token !== 'string') return null;
  const upper = token.toUpperCase();
  if (ORDERED_FACES.includes(upper)) return upper;
  const lower = token.toLowerCase();
  return COLOR_TO_FACE[lower] || null;
}

/**
 * Converts a CubeState object or face map into a 54-character URFDLB facelet string.
 * @param {Record<string, string[]> | string} cubeInput
 * @returns {string} 54-char string
 */
export function cubeStateToFaceletString(cubeInput) {
  if (typeof cubeInput === 'string') {
    if (cubeInput.length === 54) {
      // Normalize letters if needed
      return Array.from(cubeInput).map(c => normalizeToFaceId(c) || c).join('');
    }
    throw new Error(`Invalid cube string length: expected 54, got ${cubeInput.length}`);
  }

  if (!cubeInput || typeof cubeInput !== 'object') {
    throw new Error('Invalid cube input: expected CubeState object or 54-char string');
  }

  let str = '';
  for (const face of ORDERED_FACES) {
    const stickers = cubeInput[face];
    if (!Array.isArray(stickers) || stickers.length !== 9) {
      throw new Error(`Face ${face} must have exactly 9 stickers`);
    }
    for (let i = 0; i < 9; i++) {
      const faceId = normalizeToFaceId(stickers[i]);
      if (!faceId) {
        throw new Error(`Invalid sticker value at face ${face}[${i}]: ${stickers[i]}`);
      }
      str += faceId;
    }
  }
  return str;
}

/**
 * Converts a 54-char facelet string into a CubeState object with color names.
 * @param {string} faceletStr
 * @returns {Record<string, string[]>}
 */
export function faceletStringToCubeState(faceletStr) {
  if (typeof faceletStr !== 'string' || faceletStr.length !== 54) {
    throw new Error(`Expected 54-character facelet string, got ${faceletStr?.length}`);
  }

  const result = {};
  for (let f = 0; f < 6; f++) {
    const faceName = ORDERED_FACES[f];
    const faceStickers = [];
    for (let i = 0; i < 9; i++) {
      const char = faceletStr[f * 9 + i];
      const color = FACE_TO_COLOR[char] || char;
      faceStickers.push(color);
    }
    result[faceName] = faceStickers;
  }
  return result;
}

/**
 * Calculates the number of inversions in an array permutation.
 * @param {number[]} arr
 * @returns {number} 0 for even parity, 1 for odd parity
 */
function getPermutationParity(arr) {
  let inversions = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) {
        inversions++;
      }
    }
  }
  return inversions % 2;
}

/**
 * Validates full Rubik's cube state:
 * - 54 stickers present
 * - Exactly 9 of each color
 * - Invariant centers
 * - Corner and edge orientation and permutation parity
 *
 * @param {Record<string, string[]> | string} cubeInput
 * @returns {{
 *   valid: boolean,
 *   error?: string,
 *   errorDetail?: {
 *     code: 'INVALID_COLORS' | 'UNBALANCED_COUNT' | 'PARITY_ERROR',
 *     messageMs: string,
 *     messageEn: string
 *   }
 * }}
 */
export function validateCube(cubeInput) {
  // Step 1: Check format and extract facelet string
  let faceletStr;
  try {
    faceletStr = cubeStateToFaceletString(cubeInput);
  } catch (err) {
    return {
      valid: false,
      error: err.message,
      errorDetail: {
        code: 'INVALID_COLORS',
        messageMs: 'Kiub tidak lengkap: Sila pastikan semua 54 petak telah diimbas dengan betul.',
        messageEn: 'Incomplete cube: Please make sure all 54 stickers are properly assigned.',
      },
    };
  }

  if (faceletStr.length !== 54) {
    return {
      valid: false,
      error: `Expected 54 stickers, found ${faceletStr.length}`,
      errorDetail: {
        code: 'INVALID_COLORS',
        messageMs: 'Kiub tidak lengkap: Sila pastikan semua 54 petak telah diimbas.',
        messageEn: 'Incomplete cube: Please make sure all 54 stickers are scanned.',
      },
    };
  }

  // Step 2: Distribution count check (exactly 9 of each color / face)
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
  for (let i = 0; i < 54; i++) {
    const c = faceletStr[i];
    if (counts[c] !== undefined) {
      counts[c]++;
    } else {
      return {
        valid: false,
        error: `Unknown sticker identifier: ${c}`,
        errorDetail: {
          code: 'INVALID_COLORS',
          messageMs: `Petak tidak sah: Warna atau label '${c}' tidak dikenali.`,
          messageEn: `Invalid sticker: Color or identifier '${c}' is unrecognized.`,
        },
      };
    }
  }

  for (const face of ORDERED_FACES) {
    if (counts[face] !== 9) {
      const colorName = EXPECTED_CENTERS[face];
      return {
        valid: false,
        error: `Unbalanced color count: Face ${face} (${colorName}) has ${counts[face]} stickers (expected 9)`,
        errorDetail: {
          code: 'UNBALANCED_COUNT',
          messageMs: `Warna kiub tidak seimbang: Pastikan setiap warna mempunyai tepat 9 petak (ditemui ${counts[face]} untuk ${colorName}).`,
          messageEn: `Unbalanced color count: Each color must have exactly 9 stickers (found ${counts[face]} for ${colorName}).`,
        },
      };
    }
  }

  // Step 3: Center stickers invariant check
  // U center: index 4
  // R center: index 13
  // F center: index 22
  // D center: index 31
  // L center: index 40
  // B center: index 49
  const expectedCenters = ['U', 'R', 'F', 'D', 'L', 'B'];
  const centerIndices = [4, 13, 22, 31, 40, 49];

  for (let f = 0; f < 6; f++) {
    const centerIdx = centerIndices[f];
    const actualCenter = faceletStr[centerIdx];
    const expectedFace = expectedCenters[f];
    if (actualCenter !== expectedFace) {
      return {
        valid: false,
        error: `Center invariant violation at index ${centerIdx}: expected ${expectedFace}, found ${actualCenter}`,
        errorDetail: {
          code: 'INVALID_COLORS',
          messageMs: 'Pusat kiub tidak sah: Pusat mestilah Atas=Putih, Kanan=Merah, Hadapan=Hijau, Bawah=Kuning, Kiri=Jingga, Belakang=Biru.',
          messageEn: 'Invalid cube centers: Centers must be U=White, R=Red, F=Green, D=Yellow, L=Orange, B=Blue.',
        },
      };
    }
  }

  // Step 4: Corner parity and piece uniqueness
  const cp = new Array(8);
  const co = new Array(8);

  for (let i = 0; i < 8; i++) {
    const [i0, i1, i2] = CORNER_FACELET_INDICES[i];
    const stickers = [faceletStr[i0], faceletStr[i1], faceletStr[i2]];

    let ori = stickers.indexOf('U');
    if (ori === -1) ori = stickers.indexOf('D');
    if (ori === -1) {
      return {
        valid: false,
        error: `Corner ${i} lacks a U or D sticker (${stickers.join('')})`,
        errorDetail: {
          code: 'PARITY_ERROR',
          messageMs: 'Ralat pariti: Bucu kiub mengandungi gabungan warna yang mustahil.',
          messageEn: 'Parity error: Corner piece contains an impossible color combination.',
        },
      };
    }

    co[i] = ori;
    const c1 = stickers[(ori + 1) % 3];
    const c2 = stickers[(ori + 2) % 3];

    let foundPiece = -1;
    for (let j = 0; j < 8; j++) {
      if (c1 === STANDARD_CORNER_COLORS[j][1] && c2 === STANDARD_CORNER_COLORS[j][2]) {
        foundPiece = j;
        break;
      }
    }

    if (foundPiece === -1) {
      return {
        valid: false,
        error: `Corner ${i} has impossible color combination: ${stickers.join('')}`,
        errorDetail: {
          code: 'PARITY_ERROR',
          messageMs: 'Ralat bucu kiub: Gabungan warna bucu ini tidak wujud pada kiub piawai.',
          messageEn: 'Corner parity error: This corner piece combination does not exist on a standard cube.',
        },
      };
    }

    cp[i] = foundPiece;
  }

  // Verify all 8 corner pieces are unique
  const uniqueCorners = new Set(cp);
  if (uniqueCorners.size !== 8) {
    return {
      valid: false,
      error: 'Duplicate or missing corner pieces detected',
      errorDetail: {
        code: 'PARITY_ERROR',
        messageMs: 'Ralat pariti: Ada bucu bertindih atau hilang dalam imbasan.',
        messageEn: 'Parity error: Duplicate or missing corner pieces detected in scan.',
      },
    };
  }

  // Corner orientation twist sum must be 0 mod 3
  const coSum = co.reduce((sum, val) => sum + val, 0);
  if (coSum % 3 !== 0) {
    return {
      valid: false,
      error: `Corner orientation parity error (sum = ${coSum}, sum % 3 = ${coSum % 3})`,
      errorDetail: {
        code: 'PARITY_ERROR',
        messageMs: 'Ralat pariti bucu: Satu atau lebih bucu telah terputar secara fizikal.',
        messageEn: 'Corner orientation parity error: One or more corners are physically twisted.',
      },
    };
  }

  // Step 5: Edge parity and piece uniqueness
  const ep = new Array(12);
  const eo = new Array(12);

  for (let i = 0; i < 12; i++) {
    const [i0, i1] = EDGE_FACELET_INDICES[i];
    const s0 = faceletStr[i0];
    const s1 = faceletStr[i1];

    let foundPiece = -1;
    let foundOri = -1;

    for (let j = 0; j < 12; j++) {
      if (s0 === STANDARD_EDGE_COLORS[j][0] && s1 === STANDARD_EDGE_COLORS[j][1]) {
        foundPiece = j;
        foundOri = 0;
        break;
      }
      if (s0 === STANDARD_EDGE_COLORS[j][1] && s1 === STANDARD_EDGE_COLORS[j][0]) {
        foundPiece = j;
        foundOri = 1;
        break;
      }
    }

    if (foundPiece === -1) {
      return {
        valid: false,
        error: `Edge ${i} has impossible color combination: ${s0}${s1}`,
        errorDetail: {
          code: 'PARITY_ERROR',
          messageMs: 'Ralat tepi kiub: Gabungan warna tepi ini tidak wujud pada kiub piawai.',
          messageEn: 'Edge parity error: This edge piece combination does not exist on a standard cube.',
        },
      };
    }

    ep[i] = foundPiece;
    eo[i] = foundOri;
  }

  // Verify all 12 edge pieces are unique
  const uniqueEdges = new Set(ep);
  if (uniqueEdges.size !== 12) {
    return {
      valid: false,
      error: 'Duplicate or missing edge pieces detected',
      errorDetail: {
        code: 'PARITY_ERROR',
        messageMs: 'Ralat pariti: Ada bahagian tepi bertindih atau hilang dalam imbasan.',
        messageEn: 'Parity error: Duplicate or missing edge pieces detected in scan.',
      },
    };
  }

  // Edge orientation flip sum must be 0 mod 2
  const eoSum = eo.reduce((sum, val) => sum + val, 0);
  if (eoSum % 2 !== 0) {
    return {
      valid: false,
      error: `Edge orientation parity error (sum = ${eoSum}, sum % 2 = ${eoSum % 2})`,
      errorDetail: {
        code: 'PARITY_ERROR',
        messageMs: 'Ralat pariti tepi: Satu bahagian tepi kiub telah terbalik secara fizikal.',
        messageEn: 'Edge orientation parity error: A single edge piece is physically flipped.',
      },
    };
  }

  // Step 6: Permutation parity check (corner parity == edge parity)
  const cpParity = getPermutationParity(cp);
  const epParity = getPermutationParity(ep);

  if (cpParity !== epParity) {
    return {
      valid: false,
      error: `Permutation parity mismatch: corner parity ${cpParity} != edge parity ${epParity}`,
      errorDetail: {
        code: 'PARITY_ERROR',
        messageMs: 'Ralat pariti permutasi: Dua bahagian kiub tertukar (mustahil diselesaikan tanpa mencabut kiub).',
        messageEn: 'Permutation parity mismatch: Two pieces are swapped without corresponding exchange.',
      },
    };
  }

  return { valid: true };
}
