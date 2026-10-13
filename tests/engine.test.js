/**
 * Engine Automated Test Suite
 * Covers:
 * - Test 1: Parity & Color Count Validator
 * - Test 2: Color Distance Classifier & Dynamic Center Calibration
 * - Test 3: Web Worker Solver (Superflip & Standard Scrambles)
 * - Storage & State Persistence Layer (Private browsing fallback & schema enforcement)
 */

import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  StorageManager,
  STORAGE_KEYS,
  isValidCubeDraft,
  DEFAULT_LANGUAGE,
  DEFAULT_SPEED,
} from '../src/engine/storage.js';

import {
  ColorEngine,
  rgbToLab,
  deltaE,
  DEFAULT_REFERENCE_RGB,
} from '../src/engine/color-engine.js';

import {
  validateCube,
  cubeStateToFaceletString,
  faceletStringToCubeState,
} from '../src/engine/validator.js';

import {
  solveCube,
  normalizeMoves,
} from '../src/engine/solver-worker.js';

import Cube from '../src/engine/lib/cube-bundle.js';

const SOLVED_FACELET_STRING = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

// ============================================================================
// TEST SUITE 1: PARITY & COLOR COUNT VALIDATOR
// ============================================================================
describe('Cube State & Parity Validator', () => {
  it('passes on standard solved cube state', () => {
    const result = validateCube(SOLVED_FACELET_STRING);
    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);
  });

  // Prompt Test 1 requirement:
  it('Test 1: Parity & Color Count Validator: Verify failure when yellow has 10 stickers and white has 8', () => {
    // Replace first 'U' (White) with 'D' (Yellow): White has 8, Yellow has 10
    const unbalancedString = 'D' + SOLVED_FACELET_STRING.slice(1);
    const result = validateCube(unbalancedString);

    assert.equal(result.valid, false);
    assert.ok(result.error);
    assert.equal(result.errorDetail?.code, 'UNBALANCED_COUNT');
    assert.ok(result.errorDetail?.messageMs.includes('seimbang'));
    assert.ok(result.errorDetail?.messageEn.includes('Unbalanced'));
  });

  it('fails when cube string has invalid length', () => {
    const shortString = 'UUUUUUUUURRRRRRRRR';
    const result = validateCube(shortString);
    assert.equal(result.valid, false);
    assert.equal(result.errorDetail?.code, 'INVALID_COLORS');
  });

  it('fails when center stickers invariant is violated (U=White, R=Red, F=Green, D=Yellow, L=Orange, B=Blue)', () => {
    // Swap center of U (index 4) with center of R (index 13)
    const chars = SOLVED_FACELET_STRING.split('');
    chars[4] = 'R';
    chars[13] = 'U';
    const invalidCenterString = chars.join('');

    const result = validateCube(invalidCenterString);
    assert.equal(result.valid, false);
    assert.equal(result.errorDetail?.code, 'INVALID_COLORS');
    assert.ok(result.error.includes('Center invariant violation'));
  });

  it('fails on single corner twist (corner orientation parity error, sum mod 3 != 0)', () => {
    const cube = new Cube();
    // Twist corner 0
    cube.co[0] = (cube.co[0] + 1) % 3;
    const twistedStr = cube.asString();

    const result = validateCube(twistedStr);
    assert.equal(result.valid, false);
    assert.equal(result.errorDetail?.code, 'PARITY_ERROR');
    assert.ok(result.error.includes('Corner orientation parity'));
  });

  it('fails on single edge flip (edge orientation parity error, sum mod 2 != 0)', () => {
    const cube = new Cube();
    // Flip edge 0
    cube.eo[0] = (cube.eo[0] + 1) % 2;
    const flippedStr = cube.asString();

    const result = validateCube(flippedStr);
    assert.equal(result.valid, false);
    assert.equal(result.errorDetail?.code, 'PARITY_ERROR');
    assert.ok(result.error.includes('Edge orientation parity'));
  });

  it('fails on permutation parity mismatch (two corners swapped without edge swap)', () => {
    const cube = new Cube();
    // Swap corner 0 and corner 1
    const tmp = cube.cp[0];
    cube.cp[0] = cube.cp[1];
    cube.cp[1] = tmp;
    const swappedCornersStr = cube.asString();

    const result = validateCube(swappedCornersStr);
    assert.equal(result.valid, false);
    assert.equal(result.errorDetail?.code, 'PARITY_ERROR');
    assert.ok(result.error.includes('Permutation parity mismatch'));
  });

  it('converts CubeState object to 54-char facelet string and back', () => {
    const cubeState = faceletStringToCubeState(SOLVED_FACELET_STRING);
    assert.equal(cubeState.U.length, 9);
    assert.equal(cubeState.U[4], 'white');
    assert.equal(cubeState.R[4], 'red');

    const reconstructed = cubeStateToFaceletString(cubeState);
    assert.equal(reconstructed, SOLVED_FACELET_STRING);
  });
});

// ============================================================================
// TEST SUITE 2: COLOR DISTANCE CLASSIFIER & CIELAB ENGINE
// ============================================================================
describe('Adaptive Color Classifier Engine', () => {
  it('converts pure colors to CIELAB space accurately', () => {
    const [L_white, a_white, b_white] = rgbToLab(255, 255, 255);
    assert.ok(Math.abs(L_white - 100) < 0.01, 'L* of white should be ~100');
    assert.ok(Math.abs(a_white) < 0.01, 'a* of white should be ~0');
    assert.ok(Math.abs(b_white) < 0.01, 'b* of white should be ~0');

    const [L_black] = rgbToLab(0, 0, 0);
    assert.ok(Math.abs(L_black) < 0.01, 'L* of black should be ~0');
  });

  // Prompt Test 2 requirement:
  it('Test 2: Color Distance Classifier: Test discrimination between orange (rgb(255, 120, 0)) and red (rgb(220, 20, 20)) under simulated warm lighting', () => {
    const engine = new ColorEngine();

    // 1. Default baseline discrimination
    const pureOrange = [255, 120, 0];
    const pureRed = [220, 20, 20];

    assert.equal(engine.classifyColor(pureOrange), 'orange');
    assert.equal(engine.classifyColor(pureRed), 'red');

    // 2. Simulate Warm Ambient Room Lighting (excess red/yellow wavelength shift)
    // Warm light shifts RGB: higher red and green, reduced blue
    const warmShift = (rgb) => [
      Math.min(255, Math.round(rgb[0] * 1.05 + 15)),
      Math.min(255, Math.round(rgb[1] * 0.95 + 12)),
      Math.max(0, Math.round(rgb[2] * 0.70 - 10)),
    ];

    // Under warm lighting, calibrate centers using the 6 dynamic center stickers
    const warmCenters = {
      U: warmShift(DEFAULT_REFERENCE_RGB.white),
      R: warmShift(DEFAULT_REFERENCE_RGB.red),
      F: warmShift(DEFAULT_REFERENCE_RGB.green),
      D: warmShift(DEFAULT_REFERENCE_RGB.yellow),
      L: warmShift(DEFAULT_REFERENCE_RGB.orange),
      B: warmShift(DEFAULT_REFERENCE_RGB.blue),
    };

    engine.calibrateCenters(warmCenters);

    // Warm-shifted orange sticker test sample
    const warmOrangeSample = warmShift([252, 118, 5]);
    // Warm-shifted red sticker test sample
    const warmRedSample = warmShift([218, 22, 18]);

    const orangeResult = engine.classifyColorDetails(warmOrangeSample);
    const redResult = engine.classifyColorDetails(warmRedSample);

    // Discrimination test: orange classified as orange, red classified as red
    assert.equal(orangeResult.color, 'orange');
    assert.equal(redResult.color, 'red');

    // Assert wide margin of separation:
    const orangeLab = rgbToLab(...warmOrangeSample);
    const redLab = rgbToLab(...warmRedSample);
    const distBetweenOrangeAndRed = deltaE(orangeLab, redLab);
    assert.ok(
      distBetweenOrangeAndRed > 25,
      `Delta-E between orange and red under warm lighting should be > 25 (was ${distBetweenOrangeAndRed})`
    );
  });

  it('correctly classifies a 9-sticker face array with classifyFace', () => {
    const engine = new ColorEngine();
    const faceSamples = [
      [220, 20, 20],   // red
      [255, 120, 0],  // orange
      [255, 255, 255], // white
      [0, 150, 60],   // green
      [220, 20, 20],   // red (center)
      [0, 80, 200],   // blue
      [255, 215, 0],  // yellow
      [255, 120, 0],  // orange
      [220, 20, 20],   // red
    ];

    const classified = engine.classifyFace(faceSamples);
    assert.deepEqual(classified, [
      'red',
      'orange',
      'white',
      'green',
      'red',
      'blue',
      'yellow',
      'orange',
      'red',
    ]);
  });

  it('calibrating green center does not alter or contaminate white or yellow centroids', () => {
    const engine = new ColorEngine();
    const greenSample = [10, 180, 70]; // Vivid green
    const whiteSample = [250, 250, 252]; // White
    const yellowSample = [252, 220, 20]; // Yellow

    // Calibrate ONLY green/F
    engine.calibrateCenters({ green: greenSample });

    // Assert green is classified as green
    assert.equal(engine.classifyColor(greenSample), 'green');
    // White sample must still classify as white, NOT green or yellow
    assert.equal(engine.classifyColor(whiteSample), 'white');
    // Yellow sample must still classify as yellow, NOT green or white
    assert.equal(engine.classifyColor(yellowSample), 'yellow');
  });
});

// ============================================================================
// TEST SUITE 3: WEB WORKER SOLVER & MOVE NORMALIZER
// ============================================================================
describe('Kociemba Web Worker Solver & Move Normalization', () => {
  it('normalizes redundant and duplicate moves', () => {
    // Basic combinations
    assert.deepEqual(normalizeMoves(['R', 'R']), ['R2']);
    assert.deepEqual(normalizeMoves(['R', 'R', 'R']), ["R'"]);
    assert.deepEqual(normalizeMoves(['R', 'R', 'R', 'R']), []);
    assert.deepEqual(normalizeMoves(['R', "R'"]), []);
    assert.deepEqual(normalizeMoves(['R2', 'R2']), []);
    assert.deepEqual(normalizeMoves(['R2', 'R']), ["R'"]);
    assert.deepEqual(normalizeMoves(['R', 'R2']), ["R'"]);
    assert.deepEqual(normalizeMoves(["R'", "R'"]), ['R2']);

    // Commuting parallel faces: R and L commute
    assert.deepEqual(normalizeMoves(['R', 'L', 'R']), ['R2', 'L']);
    // F and B commute; F and F' cancel across B
    assert.deepEqual(normalizeMoves(['F', 'B', "F'"]), ['B']);
    // U and D commute; both cancel
    assert.deepEqual(normalizeMoves(['U', 'D', "U'", "D'"]), []);
  });

  it('returns 0 moves for an already solved cube', async () => {
    const res = await solveCube(SOLVED_FACELET_STRING);
    assert.equal(res.success, true);
    assert.deepEqual(res.moves, []);
    assert.equal(res.moveCount, 0);
  });

  // Prompt Test 3 requirement:
  it('Test 3: Web Worker Solver: Solves Superflip scramble and returns cube to solved state', async () => {
    // Superflip generator: all 12 edges flipped, corners oriented in place
    const superflipScramble = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";

    const testCube = new Cube();
    testCube.move(superflipScramble);
    const superflipFacelets = testCube.asString();

    // Verify it is not solved before solving
    assert.equal(testCube.isSolved(), false);

    // Feed to Web Worker solver
    const response = await solveCube(superflipFacelets, { timeoutMs: 5000 });

    assert.equal(response.success, true);
    assert.ok(response.moves.length > 0, 'Solution moves must not be empty');
    assert.equal(response.moveCount, response.moves.length);
    assert.ok(response.executionTimeMs >= 0);

    // Assert solution returns cube to solved state
    const verifierCube = Cube.fromString(superflipFacelets);
    verifierCube.move(response.moves.join(' '));
    assert.equal(
      verifierCube.isSolved(),
      true,
      'Applying solution moves to Superflip must return cube to solved state'
    );
  });

  it('Test 3 (extended): Solves standard 20-move scramble and returns cube to solved state', async () => {
    const scramble = "R U R' U' F' U2 F U R U2 R' D R' U2 R D' U";

    const testCube = new Cube();
    testCube.move(scramble);
    const scrambledFacelets = testCube.asString();

    const response = await solveCube(scrambledFacelets, { timeoutMs: 5000 });

    assert.equal(response.success, true);
    assert.ok(response.moves.length > 0);

    const verifierCube = Cube.fromString(scrambledFacelets);
    verifierCube.move(response.moves.join(' '));
    assert.equal(
      verifierCube.isSolved(),
      true,
      'Applying solution moves must return cube to solved state'
    );
  });

  it('rejects invalid parity cubes before solver freezes', async () => {
    const cube = new Cube();
    cube.co[0] = (cube.co[0] + 1) % 3; // twisted corner
    const twistedStr = cube.asString();

    const response = await solveCube(twistedStr);
    assert.equal(response.success, false);
    assert.equal(response.errorDetail?.code, 'PARITY_ERROR');
  });

  it('enforces timeout guard when solver search exceeds time limit', async () => {
    // With 1ms timeout, solver search should trigger SOLVER_TIMEOUT
    const scramble = "R U R' U' F' U2 F U R U2 R' D R' U2 R D' U";
    const testCube = new Cube();
    testCube.move(scramble);

    const response = await solveCube(testCube.asString(), { timeoutMs: 1 });
    assert.equal(response.success, false);
    assert.equal(response.errorDetail?.code, 'SOLVER_TIMEOUT');
    assert.ok(response.errorMessage.includes('timeout'));
  });
});

// ============================================================================
// TEST SUITE 4: STORAGE & STATE PERSISTENCE LAYER
// ============================================================================
describe('Storage & State Persistence Layer', () => {
  it('falls back to in-memory storage safely in private browsing mode or when storage throws', () => {
    // Mock restricted localStorage that throws SecurityError (like Safari Private Browsing)
    const mockRestrictedStorage = {
      getItem() { throw new Error('SecurityError: The operation is insecure.'); },
      setItem() { throw new Error('QuotaExceededError'); },
      removeItem() { throw new Error('SecurityError'); },
      clear() { throw new Error('SecurityError'); },
    };

    const storage = new StorageManager(mockRestrictedStorage);

    // Operations must not throw and must fall back gracefully to memory store
    assert.doesNotThrow(() => {
      storage.setLanguage('ms');
      storage.setSpeed(750);
      storage.setFlash(true);
    });

    assert.equal(storage.getLanguage(), 'ms');
    assert.equal(storage.getSpeed(), 750);
    assert.equal(storage.getFlash(), true);
  });

  it('enforces schema for language preferences (defaults to ms)', () => {
    const storage = new StorageManager();

    // Default is 'ms'
    assert.equal(storage.getLanguage(), DEFAULT_LANGUAGE);

    // Valid inputs
    assert.equal(storage.setLanguage('en'), true);
    assert.equal(storage.getLanguage(), 'en');

    assert.equal(storage.setLanguage('ms'), true);
    assert.equal(storage.getLanguage(), 'ms');

    // Invalid inputs rejected; preserves existing value
    assert.equal(storage.setLanguage('fr'), false);
    assert.equal(storage.getLanguage(), 'ms');

    assert.equal(storage.setLanguage(123), false);
    assert.equal(storage.getLanguage(), 'ms');
  });

  it('enforces schema for playback speed (clamped 100-5000ms, default 600ms)', () => {
    const storage = new StorageManager();

    assert.equal(storage.getSpeed(), DEFAULT_SPEED);

    assert.equal(storage.setSpeed(800), true);
    assert.equal(storage.getSpeed(), 800);

    // Out-of-bounds rejected
    assert.equal(storage.setSpeed(50), false);
    assert.equal(storage.getSpeed(), 800);

    assert.equal(storage.setSpeed(99999), false);
    assert.equal(storage.getSpeed(), 800);
  });

  it('validates cube draft schema and purges corrupted drafts', () => {
    const storage = new StorageManager();

    // Draft starts null
    assert.equal(storage.getDraft(), null);

    // Valid draft
    const validDraft = {
      U: ['white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white'],
      R: ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
      F: ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green', 'green'],
      D: ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      L: ['orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange'],
      B: ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
    };

    assert.equal(isValidCubeDraft(validDraft), true);
    assert.equal(storage.setDraft(validDraft), true);
    assert.deepEqual(storage.getDraft(), validDraft);

    // Invalid draft (e.g. missing face or sticker) rejected
    const invalidDraft = { ...validDraft, U: ['white'] };
    assert.equal(isValidCubeDraft(invalidDraft), false);
    assert.equal(storage.setDraft(invalidDraft), false);

    // If corrupted JSON was stored directly in storage, getDraft cleans it and returns null
    storage.setItem(STORAGE_KEYS.DRAFT, 'corrupted_json{{{');
    assert.equal(storage.getDraft(), null);
    assert.equal(storage.getItem(STORAGE_KEYS.DRAFT), null);
  });
});

// ============================================================================
// TEST SUITE 5: BILINGUAL I18N LOCALIZATION SYSTEM
// ============================================================================
describe('Bilingual Localization System (i18n)', async () => {
  const { CubeI18n } = await import('../src/i18n.js');

  it('supports Bahasa Melayu as default and English toggle', () => {
    CubeI18n.setLanguage('ms');
    assert.equal(CubeI18n.getLanguage(), 'ms');
    assert.equal(CubeI18n.t('appTitle'), 'Penyelesai Kiub 3x3');
    assert.equal(CubeI18n.getMoveDescription("R'"), 'Pusing muka Kanan lawan arah jam (90°)');

    CubeI18n.setLanguage('en');
    assert.equal(CubeI18n.getLanguage(), 'en');
    assert.equal(CubeI18n.t('appTitle'), '3x3 Cube Solver');
    assert.equal(CubeI18n.getMoveDescription("R'"), 'Turn Right face counter-clockwise (90°)');
  });

  it('interpolates translation parameters correctly', () => {
    CubeI18n.setLanguage('ms');
    const msgMs = CubeI18n.t('solutionReady', { moves: 14, time: 320 });
    assert.equal(msgMs, 'Penyelesaian ditemui dalam 14 pusingan (320ms)!');

    CubeI18n.setLanguage('en');
    const msgEn = CubeI18n.t('solutionReady', { moves: 14, time: 320 });
    assert.equal(msgEn, 'Solution found in 14 moves (320ms)!');
  });

  it('provides all 3D visualization and snap feedback translations in BM and EN', () => {
    CubeI18n.setLanguage('ms');
    assert.equal(CubeI18n.t('cube3dTitle'), 'Visualisasi 3D Kiub Interaktif');
    assert.ok(CubeI18n.t('cube3dHint').includes('3D'));
    assert.equal(CubeI18n.t('view3D'), 'Paparan 3D');
    assert.equal(CubeI18n.t('view2D'), 'Bentangan 2D');
    assert.equal(CubeI18n.t('angleReset'), 'Asal');
    assert.ok(CubeI18n.t('faceSavedToast', { name: 'Hadapan (Hijau)', color: 'Hijau', count: 3 }).includes('disimpan'));

    CubeI18n.setLanguage('en');
    assert.equal(CubeI18n.t('cube3dTitle'), 'Interactive 3D Cube Visualization');
    assert.ok(CubeI18n.t('cube3dHint').includes('3D'));
    assert.equal(CubeI18n.t('view3D'), '3D View');
    assert.equal(CubeI18n.t('view2D'), '2D Net');
    assert.equal(CubeI18n.t('angleReset'), 'Reset');
    assert.ok(CubeI18n.t('faceSavedToast', { name: 'Front (Green)', color: 'Green', count: 3 }).includes('saved'));
  });
});
