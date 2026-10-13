/**
 * Kociemba Solver Web Worker Client
 * Wraps Two-Phase Kociemba worker execution with:
 * - 5000ms timeout guard
 * - Move normalization (combining duplicate moves like R R -> R2)
 * - Parity and state validation
 * - Cross-environment support (Web Worker in browser, worker_threads in Node.js)
 */

import { cubeStateToFaceletString } from './validator.js';
import { normalizeMoves } from './cube-worker.js';

export { normalizeMoves };

export const DEFAULT_SOLVER_TIMEOUT_MS = 5000;

/**
 * Spawns a worker in either the browser (Web Worker) or Node.js (worker_threads).
 * @param {string} [workerPath]
 * @returns {Promise<any>}
 */
async function createWorkerInstance(workerPath) {
  if (typeof window !== 'undefined' && typeof window.Worker !== 'function') {
    throw new Error('Web Workers are not supported in this environment');
  }

  // Browser Web Worker environment
  if (typeof window !== 'undefined' || (typeof Worker !== 'undefined' && typeof process === 'undefined')) {
    const url = workerPath || './cube-worker.js';
    return new Worker(url, { type: 'module' });
  }

  // Node.js environment
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const { Worker: NodeWorker } = await import('node:worker_threads');
    const path = await import('node:path');
    const resolvedPath = workerPath || path.resolve('src/engine/cube-worker.js');
    return new NodeWorker(resolvedPath);
  }

  throw new Error('Unsupported runtime for Worker execution');
}

/**
 * Solves a Rubik's cube state asynchronously inside a Web Worker.
 *
 * @param {Record<string, string[]> | string} cubeInput 54-char string or CubeState object
 * @param {object} [options]
 * @param {number} [options.timeoutMs=5000] Maximum search duration in milliseconds
 * @param {string} [options.workerUrl] Custom worker script path or URL
 * @returns {Promise<{
 *   success: boolean,
 *   moves: string[],
 *   moveCount: number,
 *   executionTimeMs: number,
 *   errorMessage?: string,
 *   errorDetail?: {
 *     code: 'INVALID_COLORS' | 'UNBALANCED_COUNT' | 'PARITY_ERROR' | 'SOLVER_TIMEOUT',
 *     messageMs: string,
 *     messageEn: string
 *   }
 * }>}
 */
export async function solveCube(cubeInput, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SOLVER_TIMEOUT_MS;
  const startTime = Date.now();

  let cubeString;
  try {
    cubeString = cubeStateToFaceletString(cubeInput);
  } catch (err) {
    return {
      success: false,
      moves: [],
      moveCount: 0,
      executionTimeMs: 0,
      errorMessage: err.message,
      errorDetail: {
        code: 'INVALID_COLORS',
        messageMs: 'Ralat input kiub: ' + err.message,
        messageEn: 'Cube input error: ' + err.message,
      },
    };
  }

  let worker;
  try {
    worker = await createWorkerInstance(options.workerUrl);
  } catch (err) {
    return {
      success: false,
      moves: [],
      moveCount: 0,
      executionTimeMs: 0,
      errorMessage: 'Failed to initialize solver worker: ' + err.message,
      errorDetail: {
        code: 'PARITY_ERROR',
        messageMs: 'Gagal memulakan pekerja penyelesai (worker).',
        messageEn: 'Failed to initialize solver worker.',
      },
    };
  }

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      settled = true;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      try {
        worker.terminate?.();
      } catch (_e) {}
    };

    // Timeout guard (default 5000ms)
    const timeoutTimer = setTimeout(() => {
      if (settled) return;
      cleanup();
      resolve({
        success: false,
        moves: [],
        moveCount: 0,
        executionTimeMs: timeoutMs,
        errorMessage: `Solver timeout exceeded (${timeoutMs}ms limit)`,
        errorDetail: {
          code: 'SOLVER_TIMEOUT',
          messageMs: `Masa menunggu tamat: Solver melebihi had masa ${timeoutMs}ms.`,
          messageEn: `Solver timed out: Search exceeded ${timeoutMs}ms limit.`,
        },
      });
    }, timeoutMs);

    const handleMessage = (data) => {
      if (settled) return;
      cleanup();

      const duration = Date.now() - startTime;

      if (data && data.type === 'SOLVE_SUCCESS') {
        const rawMoves = data.payload?.moves || [];
        const normalized = normalizeMoves(rawMoves);
        resolve({
          success: true,
          moves: normalized,
          moveCount: normalized.length,
          executionTimeMs: data.payload?.timeTakenMs ?? duration,
        });
      } else if (data && data.type === 'SOLVE_ERROR') {
        resolve({
          success: false,
          moves: [],
          moveCount: 0,
          executionTimeMs: duration,
          errorMessage: data.payload?.errorMessage || 'Solver error',
          errorDetail: data.payload?.errorDetail,
        });
      } else {
        resolve({
          success: false,
          moves: [],
          moveCount: 0,
          executionTimeMs: duration,
          errorMessage: 'Unexpected worker response',
        });
      }
    };

    const handleError = (error) => {
      if (settled) return;
      cleanup();
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        moves: [],
        moveCount: 0,
        executionTimeMs: duration,
        errorMessage: error?.message || 'Worker runtime error',
        errorDetail: {
          code: 'PARITY_ERROR',
          messageMs: 'Ralat semasa memproses kiub dalam worker.',
          messageEn: 'Worker runtime error while processing cube.',
        },
      });
    };

    // Attach listeners for both Web Worker and Node worker
    if (typeof worker.on === 'function') {
      // Node worker_threads
      worker.on('message', handleMessage);
      worker.on('error', handleError);
    } else {
      // Web Worker
      worker.onmessage = (e) => handleMessage(e.data);
      worker.onerror = handleError;
    }

    // Dispatch solve request to worker
    const message = {
      type: 'SOLVE_CUBE',
      payload: {
        cubeString,
        maxSolutions: 1,
        maxDepth: 22,
      },
    };

    worker.postMessage(message);
  });
}
