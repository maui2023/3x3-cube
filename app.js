/**
 * 3x3 Rubik's Cube Solver — Client-Side Application
 * Full implementation of Mobile UX, Guides, i18n, Vision, Manual Sticker Correction & Solution Player
 */

import Cube from './src/engine/lib/cube-bundle.js';
import { storage } from './src/engine/storage.js';
import { colorEngine, ALL_COLORS } from './src/engine/color-engine.js';
import { validateCube, cubeStateToFaceletString, EXPECTED_CENTERS } from './src/engine/validator.js';
import CubeI18n from './src/i18n.js';

// --- DOM Elements ---
const video = document.getElementById('cameraVideo');
const captureCanvas = document.getElementById('captureCanvas');
const captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
const reticleBox = document.getElementById('reticleBox');
const centerIndicatorDot = document.getElementById('centerIndicatorDot');

// Header
const brandTitle = document.getElementById('brandTitle');
const btnLangMs = document.getElementById('btnLangMs');
const btnLangEn = document.getElementById('btnLangEn');

// Viewfinder tools & badges
const badgeFaceStep = document.getElementById('badgeFaceStep');
const badgeColorTag = document.getElementById('badgeColorTag');
const badgeStepText = document.getElementById('badgeStepText');
const btnTorch = document.getElementById('btnTorch');
const btnFlipCam = document.getElementById('btnFlipCam');

// Rotation Guide
const guideDiagramWrap = document.getElementById('guideDiagramWrap');
const guideTitle = document.getElementById('guideTitle');
const guideDesc = document.getElementById('guideDesc');
const guideHintPill = document.getElementById('guideHintPill');

// Bottom action buttons
const btnSnap = document.getElementById('btnSnap');
const btnSnapText = document.getElementById('btnSnapText');
const btnRetake = document.getElementById('btnRetake');
const btnRetakeText = document.getElementById('btnRetakeText');
const btnReset = document.getElementById('btnReset');
const btnResetText = document.getElementById('btnResetText');

// Scanned Faces section
const capturedTitle = document.getElementById('capturedTitle');
const capturedSubtitle = document.getElementById('capturedSubtitle');
const btnManualEditAll = document.getElementById('btnManualEditAll');
const btnEditStickersText = document.getElementById('btnEditStickersText');
const capturedFacesGrid = document.getElementById('capturedFacesGrid');
const validationAlert = document.getElementById('validationAlert');
const validationAlertText = document.getElementById('validationAlertText');
const solveActionWrap = document.getElementById('solveActionWrap');
const btnSolve = document.getElementById('btnSolve');
const btnSolveText = document.getElementById('btnSolveText');

// Solution Player
const solutionSection = document.getElementById('solutionSection');
const solutionStatusText = document.getElementById('solutionStatusText');
const solutionMoveCount = document.getElementById('solutionMoveCount');
const moveBadgeLarge = document.getElementById('moveBadgeLarge');
const moveTextHeading = document.getElementById('moveTextHeading');
const moveTextStep = document.getElementById('moveTextStep');
const movesRibbon = document.getElementById('movesRibbon');
const netTitle = document.getElementById('netTitle');
const btnPrevMove = document.getElementById('btnPrevMove');
const btnNextMove = document.getElementById('btnNextMove');
const btnPlayPause = document.getElementById('btnPlayPause');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');
const btnResetSolution = document.getElementById('btnResetSolution');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');

// Net Faces
const netFaceEls = {
  U: document.getElementById('netFaceU'),
  L: document.getElementById('netFaceL'),
  F: document.getElementById('netFaceF'),
  R: document.getElementById('netFaceR'),
  B: document.getElementById('netFaceB'),
  D: document.getElementById('netFaceD')
};

// Modal Color Editor
const colorModal = document.getElementById('colorModal');
const modalTitle = document.getElementById('modalTitle');
const btnModalClose = document.getElementById('btnModalClose');
const modalFaceTabs = document.getElementById('modalFaceTabs');
const modalEditorGrid = document.getElementById('modalEditorGrid');
const modalInstruction = document.getElementById('modalInstruction');
const modalPaletteTitle = document.getElementById('modalPaletteTitle');
const modalColorPalette = document.getElementById('modalColorPalette');
const modalDistributionTitle = document.getElementById('modalDistributionTitle');
const modalDistributionBar = document.getElementById('modalDistributionBar');
const btnModalSave = document.getElementById('btnModalSave');
const btnModalSaveText = document.getElementById('btnModalSaveText');

// --- Constants & Configuration ---
const FACE_KEYS = ['U', 'R', 'F', 'D', 'L', 'B'];

const COLOR_HEX_MAP = {
  white: '#f8fafc',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#eab308',
  orange: '#ea580c',
  blue: '#2563eb'
};

const FACE_CENTER_MAP = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue'
};

// --- App State ---
let currentFaceIndex = 0; // 0..5
let capturedFaces = [null, null, null, null, null, null]; // Each is array of 9 CubeColors
let cameraStream = null;
let currentFacingMode = 'environment';
let isTorchOn = false;
let solverWorker = null;
let liveScanRafId = null;

// Solution State
let solutionMoves = [];
let currentMoveIndex = -1; // -1 = initial state
let playTimer = null;
let playbackSpeed = storage.getSpeed();
let cubeStatesHistory = []; // Array of 54-char string states for each step

// Modal Editor State
let modalActiveFace = 'U';
let modalSelectedStickerIndex = 0;
let modalDraftFaces = [null, null, null, null, null, null];

// --- Helpers to convert between Array and Object representations ---
function getCubeStateObject() {
  return {
    U: capturedFaces[0],
    R: capturedFaces[1],
    F: capturedFaces[2],
    D: capturedFaces[3],
    L: capturedFaces[4],
    B: capturedFaces[5]
  };
}

function persistDraft() {
  if (capturedFaces.some(f => f !== null)) {
    const draftObj = {
      U: capturedFaces[0] || new Array(9).fill('white'),
      R: capturedFaces[1] || new Array(9).fill('red'),
      F: capturedFaces[2] || new Array(9).fill('green'),
      D: capturedFaces[3] || new Array(9).fill('yellow'),
      L: capturedFaces[4] || new Array(9).fill('orange'),
      B: capturedFaces[5] || new Array(9).fill('blue'),
    };
    storage.setDraft(draftObj);
  } else {
    storage.clearDraft();
  }
}

// --- Initialization ---
function init() {
  // 1. Language init
  const savedLang = storage.getLanguage();
  CubeI18n.setLanguage(savedLang);
  updateLanguageButtons();

  // 2. Draft restore if present
  const draft = storage.getDraft();
  if (draft && typeof draft === 'object' && draft.U && draft.R && draft.F) {
    capturedFaces = [
      draft.U || null,
      draft.R || null,
      draft.F || null,
      draft.D || null,
      draft.L || null,
      draft.B || null
    ];
    const firstEmpty = capturedFaces.findIndex(f => f === null);
    currentFaceIndex = (firstEmpty === -1) ? 5 : firstEmpty;
  }

  // 3. Speed slider init
  speedSlider.value = playbackSpeed;
  updateSpeedLabel();

  // 4. Initialize Solver Web Worker with fallback
  initSolverWorker();

  // 5. Build static UI structures
  initNetGridCells();
  initModalPaletteButtons();

  // 6. Update texts & guide
  updateAllTexts();
  renderCapturedPreviews();
  renderRotationGuide();
  validateAndCheckSolveReady();

  // 7. Start camera
  startCamera();

  // 8. Register service worker for offline PWA
  registerServiceWorker();

  // 9. Bind event listeners
  bindEvents();
}

// --- Web Worker Setup ---
function initSolverWorker() {
  try {
    if (window.Worker) {
      solverWorker = new Worker('src/engine/cube-worker.js', { type: 'module' });
      solverWorker.postMessage({ type: 'INIT' });

      solverWorker.onmessage = function(e) {
        const res = e.data;
        if (res.type === 'SOLVE_SUCCESS') {
          handleSolveSuccess(res.payload);
        } else if (res.type === 'SOLVE_ERROR') {
          handleSolveError(res.payload.error);
        }
      };

      solverWorker.onerror = function(err) {
        console.warn('Worker error or blocked by CORS/file protocol, fallback to main thread:', err);
        solverWorker = null;
      };
    }
  } catch (err) {
    console.warn('Web Worker initialization skipped:', err);
    solverWorker = null;
  }
}

// --- Camera & Viewfinder Stream ---
async function startCamera() {
  stopCamera();

  const constraints = {
    video: {
      facingMode: { ideal: currentFacingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = cameraStream;
    await video.play();

    // Check torch capability
    checkTorchSupport();

    // Start live reticle center indicator sampling
    startLiveCenterSampling();
  } catch (err) {
    console.error('Camera error:', err);
    // Try fallback to any available video stream
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = cameraStream;
      await video.play();
      startLiveCenterSampling();
    } catch (err2) {
      showCameraError(err2);
    }
  }
}

function stopCamera() {
  if (liveScanRafId) {
    cancelAnimationFrame(liveScanRafId);
    liveScanRafId = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function showCameraError(err) {
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
  let msg = CubeI18n.t('cameraPermissionNeeded') + ' ' + CubeI18n.t('cameraPermissionSub');
  if (!isHttps) {
    msg += ' (' + CubeI18n.t('cameraHttpsNotice') + ')';
  }
  validationAlertText.textContent = msg + ` [${err.name || err.message}]`;
  validationAlert.hidden = false;
}

function toggleCamera() {
  currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
  startCamera();
}

function checkTorchSupport() {
  if (!cameraStream) return;
  const track = cameraStream.getVideoTracks()[0];
  if (track && track.getCapabilities && track.getCapabilities().torch) {
    btnTorch.style.display = 'flex';
    if (storage.getTorchState()) {
      setTorch(true);
    }
  } else {
    btnTorch.style.display = 'none';
  }
}

async function setTorch(on) {
  if (!cameraStream) return;
  const track = cameraStream.getVideoTracks()[0];
  if (track && track.getCapabilities && track.getCapabilities().torch) {
    try {
      await track.applyConstraints({
        advanced: [{ torch: on }]
      });
      isTorchOn = on;
      storage.setTorchState(on);
      btnTorch.classList.toggle('active', on);
    } catch (e) {
      console.warn('Torch constraint error:', e);
    }
  }
}

function toggleTorch() {
  setTorch(!isTorchOn);
}

// --- Live Center Color Sampling for Dot Indicator ---
function startLiveCenterSampling() {
  function sampleFrame() {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw > 0 && vh > 0) {
        captureCanvas.width = 32;
        captureCanvas.height = 32;
        const cx = Math.floor(vw * 0.475);
        const cy = Math.floor(vh * 0.475);
        const sz = Math.max(10, Math.floor(Math.min(vw, vh) * 0.05));

        captureCtx.drawImage(video, cx, cy, sz, sz, 0, 0, 32, 32);
        const p = captureCtx.getImageData(16, 16, 1, 1).data;
        const classifiedColor = colorEngine.classifyColor([p[0], p[1], p[2]]);
        const hex = COLOR_HEX_MAP[classifiedColor] || '#38bdf8';
        centerIndicatorDot.style.backgroundColor = hex;
        centerIndicatorDot.style.borderColor = (classifiedColor === 'white' ? '#000' : '#fff');
      }
    }
    liveScanRafId = requestAnimationFrame(sampleFrame);
  }
  liveScanRafId = requestAnimationFrame(sampleFrame);
}

// --- Visual Cube Rotation Assistant (Isometric Dynamic SVG) ---
function renderRotationGuide() {
  const faceKey = FACE_KEYS[currentFaceIndex];
  const faceInfo = CubeI18n.t(`faces.${faceKey}`);
  const expectedCenterColor = FACE_CENTER_MAP[faceKey];

  // Update text prompts
  badgeStepText.textContent = `${CubeI18n.t('facePromptPrefix')} ${currentFaceIndex + 1}/6: ${faceInfo.name}`;
  badgeColorTag.style.backgroundColor = COLOR_HEX_MAP[expectedCenterColor];

  guideTitle.textContent = faceInfo.guideTitle;
  guideDesc.textContent = faceInfo.guideText;
  guideHintPill.textContent = faceInfo.rotationHint;

  // Render 3D Miniature Isometric SVG Diagram
  guideDiagramWrap.innerHTML = createIsometricMiniCubeSvg(currentFaceIndex);
}

function createIsometricMiniCubeSvg(stepIdx) {
  const configs = [
    { top: 'white', front: 'green', right: 'red', active: 'top', arrow: 'START' },
    { top: 'white', front: 'red', right: 'blue', active: 'front', arrow: 'LEFT' },
    { top: 'white', front: 'green', right: 'red', active: 'front', arrow: 'RIGHT' },
    { top: 'green', front: 'yellow', right: 'red', active: 'front', arrow: 'UP' },
    { top: 'white', front: 'orange', right: 'green', active: 'front', arrow: 'RIGHT' },
    { top: 'white', front: 'blue', right: 'orange', active: 'front', arrow: 'RIGHT' }
  ];

  const cfg = configs[stepIdx] || configs[0];
  const colTop = COLOR_HEX_MAP[cfg.top];
  const colFront = COLOR_HEX_MAP[cfg.front];
  const colRight = COLOR_HEX_MAP[cfg.right];

  const isTopActive = cfg.active === 'top';
  const isFrontActive = cfg.active === 'front';

  let arrowSvg = '';
  if (cfg.arrow === 'LEFT') {
    arrowSvg = `
      <path d="M 52 56 Q 34 62 14 54" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
      <polygon points="12,50 12,58 20,55" fill="#38bdf8" />
    `;
  } else if (cfg.arrow === 'RIGHT') {
    arrowSvg = `
      <path d="M 14 54 Q 34 62 52 56" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
      <polygon points="54,52 54,60 46,57" fill="#38bdf8" />
    `;
  } else if (cfg.arrow === 'UP') {
    arrowSvg = `
      <path d="M 34 58 L 34 36" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
      <polygon points="34,30 28,38 40,38" fill="#38bdf8" />
    `;
  } else {
    arrowSvg = `
      <circle cx="34" cy="18" r="4" fill="#38bdf8" />
    `;
  }

  return `
    <svg width="68" height="68" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
      <!-- Top Face -->
      <polygon points="34,8 56,18 34,28 12,18"
        fill="${colTop}" stroke="${isTopActive ? '#38bdf8' : '#000'}" stroke-width="${isTopActive ? '2.5' : '1'}" />

      <!-- Front/Left Face -->
      <polygon points="12,18 34,28 34,52 12,42"
        fill="${colFront}" stroke="${isFrontActive ? '#38bdf8' : '#000'}" stroke-width="${isFrontActive ? '2.5' : '1'}" />

      <!-- Right Face -->
      <polygon points="34,28 56,18 56,42 34,52"
        fill="${colRight}" stroke="#000" stroke-width="1" />

      <!-- Rotation Motion Indicator Arrow -->
      ${arrowSvg}
    </svg>
  `;
}

// --- Multi-pixel Patch Sampling for Snap ---
function sampleCanvasRegion(srcCanvas, rect) {
  const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
  const { x, y, size } = rect;
  const cellSize = size / 3;
  const patchRadius = Math.max(2, Math.floor(cellSize * 0.1));

  const samples = [];
  for (let ry = 0; ry < 3; ry++) {
    for (let rx = 0; rx < 3; rx++) {
      const cx = Math.floor(x + rx * cellSize + cellSize / 2);
      const cy = Math.floor(y + ry * cellSize + cellSize / 2);

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
      samples.push([avgR, avgG, avgB]);
    }
  }
  return samples;
}

// --- Snap Face Action ---
function snapCurrentFace() {
  if (!video.videoWidth || !video.videoHeight) {
    alert('Camera feed is still loading, please wait.');
    return;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  captureCanvas.width = vw;
  captureCanvas.height = vh;
  captureCtx.drawImage(video, 0, 0, vw, vh);

  const minDim = Math.min(vw, vh);
  const boxSize = minDim * 0.65;
  const rect = {
    x: Math.floor((vw - boxSize) / 2),
    y: Math.floor((vh - boxSize) / 2),
    size: Math.floor(boxSize)
  };

  // Sample 9 sticker regions with multi-pixel noise filtering
  const rgbSamples = sampleCanvasRegion(captureCanvas, rect);

  // Classify into CubeColors
  const classifiedColors = rgbSamples.map(sample => colorEngine.classifyColor(sample));

  // Dynamic Center Calibration
  const currentFaceKey = FACE_KEYS[currentFaceIndex];
  const expectedCenter = FACE_CENTER_MAP[currentFaceKey];
  classifiedColors[4] = expectedCenter; // Invariant center identity
  colorEngine.calibrateCenters({ [currentFaceKey]: rgbSamples[4] });

  // Save into state
  capturedFaces[currentFaceIndex] = classifiedColors;
  persistDraft();

  // Update UI
  btnRetake.disabled = false;
  renderCapturedPreviews();

  // Advance to next face if not all captured
  if (currentFaceIndex < 5) {
    currentFaceIndex++;
    renderRotationGuide();
  } else {
    // All 6 faces captured!
    validateAndCheckSolveReady();
  }
}

function retakeLastFace() {
  if (capturedFaces[currentFaceIndex] !== null) {
    capturedFaces[currentFaceIndex] = null;
  } else if (currentFaceIndex > 0) {
    currentFaceIndex--;
    capturedFaces[currentFaceIndex] = null;
  }
  persistDraft();
  btnRetake.disabled = (capturedFaces.every(f => f === null));
  renderCapturedPreviews();
  renderRotationGuide();
  validateAndCheckSolveReady();
}

function resetAllFaces() {
  capturedFaces = [null, null, null, null, null, null];
  currentFaceIndex = 0;
  storage.clearDraft();
  colorEngine.resetCalibration();
  btnRetake.disabled = true;
  solutionSection.hidden = true;
  solveActionWrap.hidden = true;
  validationAlert.hidden = true;
  stopPlay();
  renderCapturedPreviews();
  renderRotationGuide();
}

// --- Validation & Solver Preparation ---
function validateAndCheckSolveReady() {
  const isComplete = capturedFaces.every(f => Array.isArray(f) && f.length === 9);

  if (!isComplete) {
    solveActionWrap.hidden = true;
    validationAlert.hidden = true;
    return false;
  }

  const cubeObj = getCubeStateObject();
  const validation = validateCube(cubeObj);

  if (!validation.valid) {
    const msg = (CubeI18n.getLanguage() === 'ms')
      ? validation.errorDetail?.messageMs
      : validation.errorDetail?.messageEn;
    validationAlertText.textContent = msg || validation.error;
    validationAlert.hidden = false;
    solveActionWrap.hidden = false;
    btnSolve.disabled = true;
    return false;
  }

  // Valid cube ready to solve!
  validationAlert.hidden = true;
  solveActionWrap.hidden = false;
  btnSolve.disabled = false;
  return true;
}

// --- Solve Cube Execution ---
function solveCube() {
  const isComplete = capturedFaces.every(f => Array.isArray(f) && f.length === 9);
  if (!isComplete) {
    alert(CubeI18n.t('errors.notEnoughFaces'));
    return;
  }

  const cubeObj = getCubeStateObject();
  const validation = validateCube(cubeObj);

  if (!validation.valid) {
    const msg = (CubeI18n.getLanguage() === 'ms')
      ? validation.errorDetail?.messageMs
      : validation.errorDetail?.messageEn;
    alert(msg || validation.error);
    openColorModal(0);
    return;
  }

  solutionSection.hidden = false;
  solutionStatusText.textContent = CubeI18n.t('btnSolving');
  btnSolve.disabled = true;
  btnSolveText.textContent = CubeI18n.t('btnSolving');

  solutionSection.scrollIntoView({ behavior: 'smooth' });

  const cubeString = cubeStateToFaceletString(cubeObj);

  // Use Web Worker if available, else main thread fallback
  if (solverWorker) {
    solverWorker.postMessage({
      type: 'SOLVE_CUBE',
      payload: {
        cubeString,
        maxDepth: 22
      }
    });
  } else {
    setTimeout(() => {
      try {
        Cube.initSolver();
        const cubeInstance = Cube.fromString(cubeString);
        const t0 = Date.now();
        const solStr = cubeInstance.solve();
        const moves = solStr ? solStr.trim().split(/\s+/).filter(Boolean) : [];
        handleSolveSuccess({
          moves,
          moveCount: moves.length,
          timeTakenMs: Date.now() - t0
        });
      } catch (e) {
        handleSolveError(e.message);
      }
    }, 50);
  }
}

function handleSolveSuccess(payload) {
  btnSolve.disabled = false;
  btnSolveText.textContent = CubeI18n.t('btnSolve');

  solutionMoves = payload.moves || [];
  currentMoveIndex = -1;

  solutionStatusText.textContent = CubeI18n.t('solutionReady', {
    moves: solutionMoves.length,
    time: payload.timeTakenMs
  });
  solutionMoveCount.textContent = `${solutionMoves.length} ${CubeI18n.t('facePromptPrefix') === 'Muka' ? 'Langkah' : 'Moves'}`;

  // Pre-calculate full sequence of cube states
  precalculateCubeStates();

  // Render Moves Ribbon & 2D Net
  renderMovesRibbon();
  updatePlayerState();
}

function handleSolveError(errMsg) {
  btnSolve.disabled = false;
  btnSolveText.textContent = CubeI18n.t('btnSolve');
  solutionStatusText.textContent = CubeI18n.t('errors.unknownError') + ' (' + errMsg + ')';
  alert(CubeI18n.t('errors.parityError') + '\n\n' + errMsg);
  openColorModal(0);
}

// --- Cube State Simulation & 2D Net Updating ---
function precalculateCubeStates() {
  cubeStatesHistory = [];
  const cubeObj = getCubeStateObject();
  const initialCubeStr = cubeStateToFaceletString(cubeObj);
  const cubeSim = Cube.fromString(initialCubeStr);

  // Step -1 (Initial state)
  cubeStatesHistory.push(cubeSim.asString());

  // Steps 0..N-1
  for (const move of solutionMoves) {
    cubeSim.move(move);
    cubeStatesHistory.push(cubeSim.asString());
  }
}

function renderMovesRibbon() {
  movesRibbon.innerHTML = '';
  solutionMoves.forEach((move, idx) => {
    const chip = document.createElement('button');
    chip.className = 'move-chip';
    chip.type = 'button';
    chip.textContent = move;
    chip.dataset.idx = idx;
    chip.addEventListener('click', () => {
      stopPlay();
      jumpToMove(idx);
    });
    movesRibbon.appendChild(chip);
  });
}

function updatePlayerState() {
  // 1. Update Ribbon active pill
  const chips = movesRibbon.querySelectorAll('.move-chip');
  chips.forEach((chip, idx) => {
    chip.classList.toggle('active', idx === currentMoveIndex);
    chip.classList.toggle('completed', idx < currentMoveIndex);
  });

  if (currentMoveIndex >= 0 && chips[currentMoveIndex]) {
    chips[currentMoveIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // 2. Update Move Highlight Banner
  if (currentMoveIndex === -1) {
    moveBadgeLarge.textContent = '🏁';
    moveTextHeading.textContent = (CubeI18n.getLanguage() === 'ms') ? 'Sedia untuk bermula' : 'Ready to start';
    moveTextStep.textContent = CubeI18n.t('moveCounter', { current: 0, total: solutionMoves.length });
  } else if (currentMoveIndex >= solutionMoves.length - 1 && solutionMoves.length > 0) {
    const move = solutionMoves[currentMoveIndex];
    moveBadgeLarge.textContent = move;
    moveTextHeading.textContent = CubeI18n.getMoveDescription(move) + ' ' + CubeI18n.t('solvedCongrats');
    moveTextStep.textContent = CubeI18n.t('moveCounter', { current: solutionMoves.length, total: solutionMoves.length });
  } else {
    const move = solutionMoves[currentMoveIndex];
    moveBadgeLarge.textContent = move;
    moveTextHeading.textContent = CubeI18n.getMoveDescription(move);
    moveTextStep.textContent = CubeI18n.t('moveCounter', { current: currentMoveIndex + 1, total: solutionMoves.length });
  }

  // 3. Update Button states
  btnPrevMove.disabled = (currentMoveIndex <= -1);
  btnNextMove.disabled = (currentMoveIndex >= solutionMoves.length - 1);

  // 4. Update 2D Unfolded Cube Net
  render2DCubeNet();
}

function jumpToMove(idx) {
  currentMoveIndex = Math.max(-1, Math.min(solutionMoves.length - 1, idx));
  updatePlayerState();
}

function nextMove() {
  if (currentMoveIndex < solutionMoves.length - 1) {
    currentMoveIndex++;
    updatePlayerState();
  } else {
    stopPlay();
  }
}

function prevMove() {
  if (currentMoveIndex > -1) {
    currentMoveIndex--;
    updatePlayerState();
  }
}

function resetSolution() {
  stopPlay();
  currentMoveIndex = -1;
  updatePlayerState();
}

function startPlay() {
  if (playTimer) return;
  if (currentMoveIndex >= solutionMoves.length - 1) {
    currentMoveIndex = -1;
  }
  iconPlay.hidden = true;
  iconPause.hidden = false;

  playTimer = setInterval(() => {
    if (currentMoveIndex >= solutionMoves.length - 1) {
      stopPlay();
    } else {
      nextMove();
    }
  }, playbackSpeed);
}

function stopPlay() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  iconPlay.hidden = false;
  iconPause.hidden = true;
}

function togglePlayPause() {
  if (playTimer) {
    stopPlay();
  } else {
    startPlay();
  }
}

// --- Interactive 2D Unfolded Cube Net Rendering ---
function initNetGridCells() {
  for (const f of ['U', 'L', 'F', 'R', 'B', 'D']) {
    const el = netFaceEls[f];
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'net-sticker';
      cell.dataset.face = f;
      cell.dataset.idx = i;
      el.appendChild(cell);
    }
  }
}

function render2DCubeNet() {
  const stateStr = cubeStatesHistory[currentMoveIndex + 1];
  if (!stateStr || stateStr.length !== 54) return;

  const NOTATION_TO_COLOR = {
    U: 'white',
    R: 'red',
    F: 'green',
    D: 'yellow',
    L: 'orange',
    B: 'blue'
  };

  const offsets = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

  for (const f of ['U', 'L', 'F', 'R', 'B', 'D']) {
    const container = netFaceEls[f];
    const stickers = container.querySelectorAll('.net-sticker');
    const offset = offsets[f];

    for (let i = 0; i < 9; i++) {
      const notChar = stateStr[offset + i];
      const colorName = NOTATION_TO_COLOR[notChar] || 'white';
      stickers[i].style.backgroundColor = COLOR_HEX_MAP[colorName];
    }
  }
}

// --- Captured Faces Thumbnails ---
function renderCapturedPreviews() {
  capturedFacesGrid.innerHTML = '';

  FACE_KEYS.forEach((faceKey, fIdx) => {
    const card = document.createElement('div');
    card.className = `captured-face-card ${fIdx === currentFaceIndex ? 'active' : ''}`;
    card.dataset.idx = fIdx;

    const title = document.createElement('div');
    title.className = 'face-card-title';
    title.innerHTML = `<span>${faceKey}</span> <small>(${CubeI18n.t(`faces.${faceKey}.short`)})</small>`;
    card.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'mini-stickers-grid';

    const faceColors = capturedFaces[fIdx];
    for (let i = 0; i < 9; i++) {
      const sticker = document.createElement('div');
      sticker.className = 'mini-sticker';
      if (faceColors && faceColors[i]) {
        sticker.style.backgroundColor = COLOR_HEX_MAP[faceColors[i]];
      }
      grid.appendChild(sticker);
    }
    card.appendChild(grid);

    const badge = document.createElement('span');
    badge.className = 'face-edit-badge';
    badge.textContent = faceColors ? CubeI18n.t('tapToEditHint') : '—';
    card.appendChild(badge);

    card.addEventListener('click', () => {
      openColorModal(fIdx);
    });

    capturedFacesGrid.appendChild(card);
  });
}

// --- Manual Sticker Color Correction Modal ---
function openColorModal(faceIdx) {
  modalActiveFace = FACE_KEYS[faceIdx || 0];
  modalSelectedStickerIndex = 0;

  // Clone draft
  modalDraftFaces = capturedFaces.map((f, idx) => {
    if (Array.isArray(f)) return [...f];
    const defaultCenter = FACE_CENTER_MAP[FACE_KEYS[idx]];
    return new Array(9).fill(defaultCenter);
  });

  renderModalTabs();
  renderModalEditorGrid();
  renderModalDistributions();

  colorModal.classList.add('open');
  colorModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  colorModal.classList.remove('open');
  colorModal.setAttribute('aria-hidden', 'true');
}

function renderModalTabs() {
  modalFaceTabs.innerHTML = '';
  FACE_KEYS.forEach(f => {
    const tab = document.createElement('button');
    tab.className = `face-tab ${f === modalActiveFace ? 'active' : ''}`;
    tab.type = 'button';
    tab.textContent = `${f} (${CubeI18n.t(`faces.${f}.short`)})`;
    tab.addEventListener('click', () => {
      modalActiveFace = f;
      renderModalTabs();
      renderModalEditorGrid();
    });
    modalFaceTabs.appendChild(tab);
  });
}

function renderModalEditorGrid() {
  modalEditorGrid.innerHTML = '';
  const fIdx = FACE_KEYS.indexOf(modalActiveFace);
  const stickers = modalDraftFaces[fIdx] || new Array(9).fill('white');

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = `editor-sticker ${i === modalSelectedStickerIndex ? 'selected' : ''}`;
    cell.dataset.idx = i;
    cell.style.backgroundColor = COLOR_HEX_MAP[stickers[i]] || '#334155';

    if (i === 4) {
      cell.classList.add('center-locked');
      cell.title = CubeI18n.t('centerStickerLocked');
    }

    cell.addEventListener('click', () => {
      modalSelectedStickerIndex = i;
      renderModalEditorGrid();
    });

    modalEditorGrid.appendChild(cell);
  }
}

function initModalPaletteButtons() {
  modalColorPalette.innerHTML = '';
  ALL_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.type = 'button';
    btn.dataset.color = c;
    btn.style.backgroundColor = COLOR_HEX_MAP[c];
    btn.title = CubeI18n.t(`colors.${c}`);

    btn.addEventListener('click', () => {
      applyColorToSelectedSticker(c);
    });

    modalColorPalette.appendChild(btn);
  });
}

function applyColorToSelectedSticker(color) {
  const fIdx = FACE_KEYS.indexOf(modalActiveFace);
  if (!modalDraftFaces[fIdx]) {
    modalDraftFaces[fIdx] = new Array(9).fill('white');
  }

  // Protect center sticker invariant (index 4 is face identity)
  if (modalSelectedStickerIndex === 4) {
    alert(CubeI18n.t('centerStickerLocked'));
    return;
  }

  modalDraftFaces[fIdx][modalSelectedStickerIndex] = color;
  renderModalEditorGrid();
  renderModalDistributions();

  // Advance selection to next sticker
  if (modalSelectedStickerIndex < 8) {
    modalSelectedStickerIndex++;
    if (modalSelectedStickerIndex === 4) modalSelectedStickerIndex = 5;
    renderModalEditorGrid();
  }
}

function countDraftColors() {
  const counts = { white: 0, red: 0, green: 0, yellow: 0, orange: 0, blue: 0 };
  for (const face of modalDraftFaces) {
    if (Array.isArray(face)) {
      for (const c of face) {
        if (counts[c] !== undefined) counts[c]++;
      }
    }
  }
  return counts;
}

function renderModalDistributions() {
  modalDistributionBar.innerHTML = '';
  const counts = countDraftColors();

  ALL_COLORS.forEach(c => {
    const count = counts[c] || 0;
    const isOk = (count === 9);
    const pill = document.createElement('span');
    pill.className = `balance-pill ${isOk ? 'ok' : 'warn'}`;
    pill.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${COLOR_HEX_MAP[c]}; border:1px solid #000;"></span> ${CubeI18n.t(`colors.${c}`)}: ${count}/9 ${isOk ? '✓' : ''}`;
    modalDistributionBar.appendChild(pill);
  });
}

function saveModalEdits() {
  capturedFaces = modalDraftFaces.map(f => (f ? [...f] : null));
  persistDraft();
  closeModal();
  renderCapturedPreviews();
  validateAndCheckSolveReady();
}

// --- Language & Localization Switching ---
function setLanguage(lang) {
  CubeI18n.setLanguage(lang);
  storage.setLanguage(lang);
  updateLanguageButtons();
  updateAllTexts();
  renderRotationGuide();
  renderCapturedPreviews();
  if (solutionMoves.length > 0) {
    updatePlayerState();
  }
}

function updateLanguageButtons() {
  const cur = CubeI18n.getLanguage();
  btnLangMs.classList.toggle('active', cur === 'ms');
  btnLangEn.classList.toggle('active', cur === 'en');
  document.documentElement.lang = cur;
}

function updateAllTexts() {
  brandTitle.textContent = CubeI18n.t('appTitle');
  btnSnapText.textContent = CubeI18n.t('btnSnap');
  btnRetakeText.textContent = CubeI18n.t('btnRetake');
  btnResetText.textContent = CubeI18n.t('btnReset');
  btnSolveText.textContent = CubeI18n.t('btnSolve');
  capturedTitle.textContent = CubeI18n.t('capturedFacesTitle');
  capturedSubtitle.textContent = CubeI18n.t('capturedSummary');
  btnEditStickersText.textContent = CubeI18n.t('btnEditStickers');
  modalTitle.textContent = CubeI18n.t('colorEditorTitle');
  modalInstruction.textContent = CubeI18n.t('colorEditorInstruction');
  modalPaletteTitle.textContent = CubeI18n.t('colorEditorTitle');
  modalDistributionTitle.textContent = CubeI18n.t('colorDistributionTitle');
  btnModalSaveText.textContent = CubeI18n.t('btnApply');
  netTitle.textContent = CubeI18n.t('cubeNetTitle');
  updateSpeedLabel();
}

function updateSpeedLabel() {
  speedLabel.textContent = `${CubeI18n.t('playerSpeed')}: ${playbackSpeed}ms`;
}

// --- Service Worker ---
function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('ServiceWorker registration error:', err);
    });
  }
}

// --- Event Bindings ---
function bindEvents() {
  btnLangMs.addEventListener('click', () => setLanguage('ms'));
  btnLangEn.addEventListener('click', () => setLanguage('en'));

  btnTorch.addEventListener('click', toggleTorch);
  btnFlipCam.addEventListener('click', toggleCamera);

  btnSnap.addEventListener('click', snapCurrentFace);
  btnRetake.addEventListener('click', retakeLastFace);
  btnReset.addEventListener('click', resetAllFaces);
  btnSolve.addEventListener('click', solveCube);

  btnManualEditAll.addEventListener('click', () => openColorModal(currentFaceIndex));
  btnModalClose.addEventListener('click', closeModal);
  btnModalSave.addEventListener('click', saveModalEdits);

  colorModal.addEventListener('click', (e) => {
    if (e.target === colorModal) closeModal();
  });

  // Player Controls
  btnPrevMove.addEventListener('click', () => { stopPlay(); prevMove(); });
  btnNextMove.addEventListener('click', () => { stopPlay(); nextMove(); });
  btnPlayPause.addEventListener('click', togglePlayPause);
  btnResetSolution.addEventListener('click', resetSolution);

  speedSlider.addEventListener('input', (e) => {
    playbackSpeed = parseInt(e.target.value, 10) || 700;
    storage.setSpeed(playbackSpeed);
    updateSpeedLabel();
    if (playTimer) {
      stopPlay();
      startPlay();
    }
  });

  // Clean up camera on unload
  window.addEventListener('beforeunload', stopCamera);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}