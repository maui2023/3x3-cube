/**
 * Bilingual Localization System (Bahasa Melayu & English)
 * Default language: Bahasa Melayu ('ms')
 */
'use strict';

const DICTIONARY = {
    ms: {
      appTitle: "Penyelesai Kiub 3x3",
      appSubtitle: "Imbas 6 muka kiub dengan kamera telefon, dapatkan panduan langkah demi langkah penyelesaian pantas.",
      langSelector: "Bahasa",
      btnSnap: "Tangkap Muka",
      btnRetake: "Imbas Semula",
      btnReset: "Set Semula",
      btnSolve: "Selesaikan Kiub",
      btnSolving: "Sedang Menyelesaikan...",
      btnTorchOn: "Nyalakan Lampu",
      btnTorchOff: "Padamkan Lampu",
      btnFlipCam: "Tukar Kamera",
      btnEditStickers: "Sunting Pelekat",
      btnClose: "Tutup",
      btnDone: "Selesai",
      btnCancel: "Batal",
      btnApply: "Simpan & Guna",

      // Face names & instructions
      facePromptPrefix: "Muka",
      faces: {
        U: {
          name: "Atas (Putih)",
          short: "Putih",
          guideTitle: "Langkah 1: Muka Atas (Putih)",
          guideText: "Pegang kiub dengan muka Putih menghadap kamera, dan muka Hijau di hadapan bawah.",
          rotationHint: "Pegang muka Putih di hadapan kamera"
        },
        R: {
          name: "Kanan (Merah)",
          short: "Merah",
          guideTitle: "Langkah 2: Muka Kanan (Merah)",
          guideText: "Pusing kiub 90° ke kiri (supaya muka Merah kini menghadap kamera).",
          rotationHint: "Pusing kiub 90° ke kiri ⬅️"
        },
        F: {
          name: "Hadapan (Hijau)",
          short: "Hijau",
          guideTitle: "Langkah 3: Muka Hadapan (Hijau)",
          guideText: "Pusing kiub 90° ke kanan kembali ke muka Hadapan (Hijau).",
          rotationHint: "Pusing kiub 90° ke kanan ➡️"
        },
        D: {
          name: "Bawah (Kuning)",
          short: "Kuning",
          guideTitle: "Langkah 4: Muka Bawah (Kuning)",
          guideText: "Condongkan kiub ke atas supaya muka Bawah (Kuning) menghadap kamera.",
          rotationHint: "Condongkan kiub ke atas ⬆️"
        },
        L: {
          name: "Kiri (Jingga)",
          short: "Jingga",
          guideTitle: "Langkah 5: Muka Kiri (Jingga / Orange)",
          guideText: "Kembalikan ke muka Hijau kemudian pusing kiub 90° ke kanan (muka Jingga menghadap kamera).",
          rotationHint: "Pusing ke muka Jingga ➡️"
        },
        B: {
          name: "Belakang (Biru)",
          short: "Biru",
          guideTitle: "Langkah 6: Muka Belakang (Biru)",
          guideText: "Pusing kiub 90° ke kanan sekali lagi untuk mengimbas muka Belakang (Biru).",
          rotationHint: "Pusing ke muka Biru ➡️"
        }
      },

      // Color names
      colors: {
        white: "Putih",
        red: "Merah",
        green: "Hijau",
        yellow: "Kuning",
        orange: "Jingga",
        blue: "Biru"
      },

      // Viewfinder & camera tips
      viewfinderTip: "Pastikan 9 kotak berada tepat di dalam petak panduan dan pencahayaan sekata.",
      cameraPermissionNeeded: "Kebenaran kamera diperlukan untuk mengimbas kiub.",
      cameraPermissionSub: "Sila benarkan akses kamera dalam tetapan pelayar anda.",
      cameraHttpsNotice: "Kamera memerlukan sambungan selamat HTTPS atau localhost.",

      // Scanned faces section
      capturedFacesTitle: "Muka Yang Telah Diimbas",
      capturedSummary: "Ketik mana-mana muka atau kotak untuk membetulkan warna pelekat secara manual.",
      tapToEditHint: "Ketik untuk betulkan",
      allFacesCaptured: "Kesemua 6 muka telah diimbas!",

      // Editor modal
      colorEditorTitle: "Betulkan Warna Pelekat",
      colorEditorInstruction: "Pilih pelekat di atas, kemudian ketik warna palet di bawah untuk mengubahnya.",
      colorDistributionTitle: "Keseimbangan Warna (Mesti 9 setiap warna):",
      centerStickerLocked: "Kotak tengah tidak boleh diubah (mewakili muka)",

      // Solver player
      solutionTitle: "Langkah Penyelesaian",
      solutionReady: "Penyelesaian ditemui dalam {moves} pusingan ({time}ms)!",
      playerPrev: "Undur",
      playerPlay: "Main",
      playerPause: "Jeda",
      playerNext: "Maju",
      playerReset: "Mula Semula",
      playerSpeed: "Kelajuan",
      moveCounter: "Langkah {current} daripada {total}",
      solvedCongrats: "🎉 Kiub Berjaya Diselesaikan!",
      cubeNetTitle: "Pandangan Bentangan 2D Kiub",

      // Plain language move translations
      moves: {
        "R": "Pusing muka Kanan ikut arah jam (90°)",
        "R'": "Pusing muka Kanan lawan arah jam (90°)",
        "R2": "Pusing muka Kanan 180° (dua kali)",
        "L": "Pusing muka Kiri ikut arah jam (90°)",
        "L'": "Pusing muka Kiri lawan arah jam (90°)",
        "L2": "Pusing muka Kiri 180° (dua kali)",
        "U": "Pusing muka Atas ikut arah jam (90°)",
        "U'": "Pusing muka Atas lawan arah jam (90°)",
        "U2": "Pusing muka Atas 180° (dua kali)",
        "D": "Pusing muka Bawah ikut arah jam (90°)",
        "D'": "Pusing muka Bawah lawan arah jam (90°)",
        "D2": "Pusing muka Bawah 180° (dua kali)",
        "F": "Pusing muka Hadapan ikut arah jam (90°)",
        "F'": "Pusing muka Hadapan lawan arah jam (90°)",
        "F2": "Pusing muka Hadapan 180° (dua kali)",
        "B": "Pusing muka Belakang ikut arah jam (90°)",
        "B'": "Pusing muka Belakang lawan arah jam (90°)",
        "B2": "Pusing muka Belakang 180° (dua kali)"
      },

      // Validation errors
      errors: {
        notEnoughFaces: "Sila imbas kesemua 6 muka kiub dahulu.",
        unbalancedCount: "Warna kiub tidak seimbang: Pastikan setiap warna ada tepat 9 kotak.",
        invalidCenters: "Pusat kiub tidak sepadan dengan susunan piawai (U:Putih, R:Merah, F:Hijau, D:Kuning, L:Jingga, B:Biru).",
        parityError: "Ralat Pariti Kiub: Susunan bucu/tepi tidak sah secara fizikal. Sila semak semula warna pelekat.",
        solverTimeout: "Masa proses melebihi had (5 saat). Sila periksa warna pelekat.",
        noSolution: "Penyelesai tidak dapat mencari jalan penyelesaian untuk susunan ini.",
        unknownError: "Berlaku ralat semasa menyelesaikan kiub."
      }
    },

    en: {
      appTitle: "3x3 Cube Solver",
      appSubtitle: "Scan all 6 faces using your mobile camera, get instant step-by-step 3D/2D visual solving instructions.",
      langSelector: "Language",
      btnSnap: "Snap Face",
      btnRetake: "Retake Face",
      btnReset: "Reset All",
      btnSolve: "Solve Cube",
      btnSolving: "Solving Cube...",
      btnTorchOn: "Turn Torch On",
      btnTorchOff: "Turn Torch Off",
      btnFlipCam: "Flip Camera",
      btnEditStickers: "Edit Stickers",
      btnClose: "Close",
      btnDone: "Done",
      btnCancel: "Cancel",
      btnApply: "Save & Apply",

      // Face names & instructions
      facePromptPrefix: "Face",
      faces: {
        U: {
          name: "Up (White)",
          short: "White",
          guideTitle: "Step 1: Up Face (White)",
          guideText: "Hold cube with White face towards camera, and Green face facing front-down.",
          rotationHint: "Position White face in front of camera"
        },
        R: {
          name: "Right (Red)",
          short: "Red",
          guideTitle: "Step 2: Right Face (Red)",
          guideText: "Rotate cube 90° left so Red face is now facing camera.",
          rotationHint: "Rotate cube 90° left ⬅️"
        },
        F: {
          name: "Front (Green)",
          short: "Green",
          guideTitle: "Step 3: Front Face (Green)",
          guideText: "Rotate cube 90° right back to Front face (Green).",
          rotationHint: "Rotate cube 90° right ➡️"
        },
        D: {
          name: "Down (Yellow)",
          short: "Yellow",
          guideTitle: "Step 4: Down Face (Yellow)",
          guideText: "Tilt cube upwards so Down face (Yellow) faces camera.",
          rotationHint: "Tilt cube upwards ⬆️"
        },
        L: {
          name: "Left (Orange)",
          short: "Orange",
          guideTitle: "Step 5: Left Face (Orange)",
          guideText: "Return to Green, then rotate cube 90° right (Orange face towards camera).",
          rotationHint: "Rotate to Orange face ➡️"
        },
        B: {
          name: "Back (Blue)",
          short: "Blue",
          guideTitle: "Step 6: Back Face (Blue)",
          guideText: "Rotate cube 90° right once more to capture Back face (Blue).",
          rotationHint: "Rotate to Blue face ➡️"
        }
      },

      // Color names
      colors: {
        white: "White",
        red: "Red",
        green: "Green",
        yellow: "Yellow",
        orange: "Orange",
        blue: "Blue"
      },

      // Viewfinder & camera tips
      viewfinderTip: "Align all 9 stickers within the grid squares under clear, even lighting.",
      cameraPermissionNeeded: "Camera permission is required to scan the cube.",
      cameraPermissionSub: "Please enable camera access in your browser site settings.",
      cameraHttpsNotice: "Camera requires a secure HTTPS or localhost origin.",

      // Scanned faces section
      capturedFacesTitle: "Captured Faces",
      capturedSummary: "Tap any face or sticker to manually correct colors if shadows caused misdetection.",
      tapToEditHint: "Tap to correct",
      allFacesCaptured: "All 6 faces captured!",

      // Editor modal
      colorEditorTitle: "Correct Sticker Colors",
      colorEditorInstruction: "Select a sticker above, then tap a color from the palette below to change it.",
      colorDistributionTitle: "Color Balance (Must be 9 of each color):",
      centerStickerLocked: "Center sticker is fixed (represents face orientation)",

      // Solver player
      solutionTitle: "Solution Steps",
      solutionReady: "Solution found in {moves} moves ({time}ms)!",
      playerPrev: "Prev",
      playerPlay: "Play",
      playerPause: "Pause",
      playerNext: "Next",
      playerReset: "Reset",
      playerSpeed: "Speed",
      moveCounter: "Move {current} of {total}",
      solvedCongrats: "🎉 Cube Solved Successfully!",
      cubeNetTitle: "Interactive 2D Cube Net",

      // Plain language move translations
      moves: {
        "R": "Turn Right face clockwise (90°)",
        "R'": "Turn Right face counter-clockwise (90°)",
        "R2": "Turn Right face 180° (twice)",
        "L": "Turn Left face clockwise (90°)",
        "L'": "Turn Left face counter-clockwise (90°)",
        "L2": "Turn Left face 180° (twice)",
        "U": "Turn Up face clockwise (90°)",
        "U'": "Turn Up face counter-clockwise (90°)",
        "U2": "Turn Up face 180° (twice)",
        "D": "Turn Down face clockwise (90°)",
        "D'": "Turn Down face counter-clockwise (90°)",
        "D2": "Turn Down face 180° (twice)",
        "F": "Turn Front face clockwise (90°)",
        "F'": "Turn Front face counter-clockwise (90°)",
        "F2": "Turn Front face 180° (twice)",
        "B": "Turn Back face clockwise (90°)",
        "B'": "Turn Back face counter-clockwise (90°)",
        "B2": "Turn Back face 180° (twice)"
      },

      // Validation errors
      errors: {
        notEnoughFaces: "Please scan all 6 faces first.",
        unbalancedCount: "Unbalanced cube colors: Ensure exactly 9 stickers of each color.",
        invalidCenters: "Center stickers do not match standard orientation (U:White, R:Red, F:Green, D:Yellow, L:Orange, B:Blue).",
        parityError: "Cube Parity Error: Physical corner/edge permutation is invalid. Please verify sticker colors.",
        solverTimeout: "Solving timed out (5s limit). Please check sticker colors.",
        noSolution: "No solution found for this state. Please verify cube stickers.",
        unknownError: "An unexpected error occurred while solving the cube."
      }
    }
  };

  let currentLang = 'ms';

  const CubeI18n = {
    getLanguage: function() {
      return currentLang;
    },
    setLanguage: function(lang) {
      if (DICTIONARY[lang]) {
        currentLang = lang;
      }
      return currentLang;
    },
    t: function(path, params) {
      const keys = path.split('.');
      let val = DICTIONARY[currentLang];
      for (const k of keys) {
        if (val && typeof val === 'object' && k in val) {
          val = val[k];
        } else {
          // Fallback to English
          let fallback = DICTIONARY['en'];
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in fallback) {
              fallback = fallback[fk];
            } else {
              return path;
            }
          }
          val = fallback;
          break;
        }
      }
      if (typeof val === 'string' && params) {
        return val.replace(/\{(\w+)\}/g, (match, p) => (p in params ? params[p] : match));
      }
      return val || path;
    },
    getMoveDescription: function(move) {
      const langDict = DICTIONARY[currentLang] || DICTIONARY.ms;
      return langDict.moves[move] || (currentLang === 'ms' ? `Pusing muka ${move}` : `Turn ${move}`);
    },
    getAll: function() {
      return DICTIONARY[currentLang];
    }
};

if (typeof globalThis !== 'undefined') {
  globalThis.CubeI18n = CubeI18n;
}
if (typeof window !== 'undefined') {
  window.CubeI18n = CubeI18n;
}

export { CubeI18n };
export default CubeI18n;
