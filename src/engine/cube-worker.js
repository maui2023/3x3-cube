/**
 * Standalone Kociemba Two-Phase Rubik's Cube Solver Worker
 * Supports both standard Web Worker (browser) and node:worker_threads (headless tests).
 */

import Cube from './lib/cube-bundle.js';
import { validateCube, cubeStateToFaceletString } from './validator.js';

let solverInitialized = false;

function ensureSolverInitialized() {
  if (!solverInitialized) {
    Cube.initSolver();
    solverInitialized = true;
  }
}

const OPPOSITE_FACE = {
  U: 'D', D: 'U',
  L: 'R', R: 'L',
  F: 'B', B: 'F',
};

function parseMove(m) {
  const face = m[0];
  let amount = 1;
  if (m.endsWith('2')) amount = 2;
  else if (m.endsWith("'")) amount = 3;
  return { face, amount };
}

function formatMove(face, amount) {
  amount = ((amount % 4) + 4) % 4;
  if (amount === 0) return null;
  if (amount === 1) return face;
  if (amount === 2) return face + '2';
  if (amount === 3) return face + "'";
}

/**
 * Normalizes output moves, combining duplicate moves like `R R` -> `R2`
 * and cancelling opposite/commuting face moves where applicable.
 *
 * @param {string[] | string} moves
 * @returns {string[]}
 */
export function normalizeMoves(moves) {
  if (typeof moves === 'string') {
    moves = moves.trim() ? moves.trim().split(/\s+/) : [];
  }
  if (!Array.isArray(moves) || moves.length === 0) return [];

  const result = [];
  for (const moveStr of moves) {
    if (!moveStr || typeof moveStr !== 'string') continue;
    const current = parseMove(moveStr);

    let merged = false;
    for (let i = result.length - 1; i >= 0; i--) {
      const prev = result[i];
      if (prev.face === current.face) {
        const newAmount = (prev.amount + current.amount) % 4;
        if (newAmount === 0) {
          result.splice(i, 1);
        } else {
          result[i].amount = newAmount;
        }
        merged = true;
        break;
      } else if (OPPOSITE_FACE[prev.face] === current.face) {
        // Commuting opposite face — continue looking further back
        continue;
      } else {
        // Non-commuting face — stop looking back
        break;
      }
    }

    if (!merged) {
      result.push(current);
    }
  }

  return result.map((m) => formatMove(m.face, m.amount)).filter(Boolean);
}

/**
 * Process a SOLVE_CUBE request and post appropriate response
 * @param {any} message
 * @param {(response: any) => void} postFn
 */
export function processWorkerMessage(message, postFn) {
  if (!message || message.type !== 'SOLVE_CUBE') {
    return;
  }

  const startTime = Date.now();
  const payload = message.payload || {};
  let cubeString = payload.cubeString;

  if (!cubeString && payload.cubeState) {
    try {
      cubeString = cubeStateToFaceletString(payload.cubeState);
    } catch (err) {
      postFn({
        type: 'SOLVE_ERROR',
        payload: {
          errorMessage: err.message,
          errorDetail: {
            code: 'INVALID_COLORS',
            messageMs: 'Ralat format kiub: ' + err.message,
            messageEn: 'Cube format error: ' + err.message,
          },
        },
      });
      return;
    }
  }

  // Pre-validate cube state and parity to prevent solver freezes
  const validation = validateCube(cubeString);
  if (!validation.valid) {
    postFn({
      type: 'SOLVE_ERROR',
      payload: {
        errorMessage: validation.error,
        errorDetail: validation.errorDetail,
      },
    });
    return;
  }

  try {
    ensureSolverInitialized();
    const cube = Cube.fromString(cubeString);

    // If already solved, return 0 moves immediately
    if (cube.isSolved()) {
      postFn({
        type: 'SOLVE_SUCCESS',
        payload: {
          moves: [],
          moveCount: 0,
          timeTakenMs: Date.now() - startTime,
        },
      });
      return;
    }

    // Solve with Two-Phase Kociemba
    const rawSolution = cube.solve();
    const normalizedMoves = normalizeMoves(rawSolution);

    postFn({
      type: 'SOLVE_SUCCESS',
      payload: {
        moves: normalizedMoves,
        moveCount: normalizedMoves.length,
        timeTakenMs: Date.now() - startTime,
      },
    });
  } catch (err) {
    postFn({
      type: 'SOLVE_ERROR',
      payload: {
        errorMessage: err.message,
        errorDetail: {
          code: 'PARITY_ERROR',
          messageMs: 'Ralat semasa mencari penyelesaian: ' + err.message,
          messageEn: 'Error during solution search: ' + err.message,
        },
      },
    });
  }
}

// Hook into Web Worker environment if available
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (event) => {
    processWorkerMessage(event.data, (res) => self.postMessage(res));
  };
}

// Hook into Node.js worker_threads environment if running in Node
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  import('node:worker_threads').then(({ parentPort }) => {
    if (parentPort) {
      parentPort.on('message', (data) => {
        processWorkerMessage(data, (res) => parentPort.postMessage(res));
      });
    }
  }).catch(() => {});
}
