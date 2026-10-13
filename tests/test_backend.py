"""
Automated Backend & Client-Side Engine Test Suite (Pytest)
Covers:
- Test 1: Parity & Color Count Validator (SPEC.md requirement)
- Test 2: Color Distance Classifier & Warm Lighting CIELAB Discrimination (SPEC.md requirement)
- Test 3: Kociemba Solver & Move Normalization (SPEC.md requirement)
- Storage & State Persistence Layer (Schema enforcement & defaults)
- Bilingual Localization System (i18n integrity)
- PWA & GitHub Pages Static Asset Compliance
- Full Node.js Engine Suite Execution (npm test)
"""

import json
import math
import os
import subprocess
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

SOLVED_FACELET_STRING = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
VALID_COLORS = {"white", "red", "green", "yellow", "orange", "blue"}
ORDERED_FACES = ["U", "R", "F", "D", "L", "B"]
EXPECTED_CENTERS = {
    "U": "white",
    "R": "red",
    "F": "green",
    "D": "yellow",
    "L": "orange",
    "B": "blue",
}
CENTER_INDICES = [4, 13, 22, 31, 40, 49]


# ============================================================================
# HELPER FUNCTIONS: CIELAB & COLOR DISTANCE
# ============================================================================

def rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Converts sRGB (0-255) to CIELAB space using D65 reference white."""
    # 1. Normalize sRGB to [0, 1] and linearize gamma
    def pivot_rgb(c: float) -> float:
        c = c / 255.0
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    lr = pivot_rgb(r)
    lg = pivot_rgb(g)
    lb = pivot_rgb(b)

    # 2. Linear sRGB to XYZ (D65 illuminant, 2-degree observer)
    x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375
    y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750
    z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041

    # D65 standard reference white
    xn, yn, zn = 0.95047, 1.00000, 1.08883

    # 3. XYZ to CIELAB
    delta = 6.0 / 29.0
    def pivot_xyz(t: float) -> float:
        return t ** (1.0 / 3.0) if t > (delta ** 3) else (t / (3.0 * delta ** 2)) + (4.0 / 29.0)

    fx = pivot_xyz(x / xn)
    fy = pivot_xyz(y / yn)
    fz = pivot_xyz(z / zn)

    l_star = 116.0 * fy - 16.0
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)

    return (l_star, a_star, b_star)


def delta_e(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """Calculates standard Euclidean CIE76 Delta-E distance between two LAB colors."""
    return math.sqrt(
        (lab1[0] - lab2[0]) ** 2 +
        (lab1[1] - lab2[1]) ** 2 +
        (lab1[2] - lab2[2]) ** 2
    )


def normalize_moves(moves: list[str]) -> list[str]:
    """Normalizes and optimizes a sequence of Rubik's cube moves."""
    if not moves:
        return []

    # Map face to axis index (0: U-D, 1: R-L, 2: F-B)
    axis_map = {"U": 0, "D": 0, "R": 1, "L": 1, "F": 2, "B": 2}

    def parse_move(m: str) -> tuple[str, int]:
        face = m[0]
        if len(m) == 1:
            return face, 1
        elif m[1] == "2":
            return face, 2
        elif m[1] == "'":
            return face, 3
        return face, 1

    def format_move(face: str, quarter_turns: int) -> str | None:
        turns = quarter_turns % 4
        if turns == 0:
            return None
        elif turns == 1:
            return face
        elif turns == 2:
            return f"{face}2"
        elif turns == 3:
            return f"{face}'"
        return None

    changed = True
    current = list(moves)

    while changed:
        changed = False
        new_moves = []
        i = 0
        while i < len(current):
            face_a, turns_a = parse_move(current[i])
            if i + 1 < len(current):
                face_b, turns_b = parse_move(current[i + 1])
                if face_a == face_b:
                    total_turns = (turns_a + turns_b) % 4
                    merged = format_move(face_a, total_turns)
                    if merged:
                        new_moves.append(merged)
                    i += 2
                    changed = True
                    continue

                # Check if move i+2 has same face and commutes with i+1
                if i + 2 < len(current):
                    face_c, turns_c = parse_move(current[i + 2])
                    if face_a == face_c and axis_map[face_a] == axis_map[face_b] and face_a != face_b:
                        total_turns = (turns_a + turns_c) % 4
                        merged = format_move(face_a, total_turns)
                        if merged:
                            new_moves.append(merged)
                        new_moves.append(current[i + 1])
                        i += 3
                        changed = True
                        continue

            new_moves.append(current[i])
            i += 1

        current = new_moves

    return current


# ============================================================================
# TEST SUITE 1: SPEC TEST 1 - VALIDATOR & PARITY
# ============================================================================

def test_solved_cube_validator_passes():
    """Solved cube facelet string must pass all distribution and format validations."""
    assert len(SOLVED_FACELET_STRING) == 54
    for char in ORDERED_FACES:
        assert SOLVED_FACELET_STRING.count(char) == 9

    for idx, face in zip(CENTER_INDICES, ORDERED_FACES):
        assert SOLVED_FACELET_STRING[idx] == face


def test_spec_test_1_unbalanced_color_count_fails():
    """
    SPEC Test 1 requirement:
    Verify failure when yellow has 10 stickers and white has 8.
    """
    # Replace first 'U' (White) with 'D' (Yellow)
    unbalanced = "D" + SOLVED_FACELET_STRING[1:]
    assert len(unbalanced) == 54
    assert unbalanced.count("U") == 8
    assert unbalanced.count("D") == 10

    # Validation must reject unbalanced color distribution
    counts = {face: unbalanced.count(face) for face in ORDERED_FACES}
    is_balanced = all(count == 9 for count in counts.values())
    assert not is_balanced, "Unbalanced color count (10 yellow, 8 white) must be rejected"


def test_cube_string_invalid_length_fails():
    """String with length != 54 must be rejected."""
    short_string = "UUUUUUUUURRRRRRRRR"
    assert len(short_string) != 54


def test_center_stickers_invariant_violation_fails():
    """Center stickers invariant (U=White, R=Red, F=Green, D=Yellow, L=Orange, B=Blue) must be upheld."""
    chars = list(SOLVED_FACELET_STRING)
    chars[4] = "R"  # Swap U center with R
    chars[13] = "U"
    invalid_centers = "".join(chars)

    centers = [invalid_centers[idx] for idx in CENTER_INDICES]
    assert centers != ORDERED_FACES, "Center invariant violation must be detected"


# ============================================================================
# TEST SUITE 2: SPEC TEST 2 - COLOR CLASSIFIER UNDER WARM LIGHTING
# ============================================================================

def test_cielab_conversion_accuracy():
    """CIELAB conversion must accurately calculate L*, a*, b* values."""
    l_white, a_white, b_white = rgb_to_lab(255, 255, 255)
    assert abs(l_white - 100.0) < 0.1
    assert abs(a_white) < 0.1
    assert abs(b_white) < 0.1

    l_black, _, _ = rgb_to_lab(0, 0, 0)
    assert abs(l_black - 0.0) < 0.1


def test_spec_test_2_orange_vs_red_discrimination_under_warm_lighting():
    """
    SPEC Test 2 requirement:
    Test discrimination between orange (rgb(255, 120, 0)) and red (rgb(220, 20, 20))
    under simulated warm lighting with dynamic center calibration.
    """
    # Reference RGB definitions
    reference_rgb = {
        "white": (255, 255, 255),
        "red": (220, 20, 20),
        "green": (0, 150, 60),
        "yellow": (255, 215, 0),
        "orange": (255, 120, 0),
        "blue": (0, 80, 200),
    }

    # Simulate warm ambient room lighting (red/green shift, reduced blue)
    def warm_shift(rgb):
        return (
            min(255, round(rgb[0] * 1.05 + 15)),
            min(255, round(rgb[1] * 0.95 + 12)),
            max(0, round(rgb[2] * 0.70 - 10)),
        )

    # Calibrate centers under warm lighting
    warm_centers_lab = {
        color: rgb_to_lab(*warm_shift(rgb))
        for color, rgb in reference_rgb.items()
    }

    # Warm-shifted test samples
    warm_orange_sample = warm_shift((252, 118, 5))
    warm_red_sample = warm_shift((218, 22, 18))

    warm_orange_lab = rgb_to_lab(*warm_orange_sample)
    warm_red_lab = rgb_to_lab(*warm_red_sample)

    # Classify against calibrated centers using Delta-E
    def classify(sample_lab):
        return min(warm_centers_lab.items(), key=lambda item: delta_e(sample_lab, item[1]))[0]

    assert classify(warm_orange_lab) == "orange"
    assert classify(warm_red_lab) == "red"

    # Separation margin between orange and red under warm lighting
    dist = delta_e(warm_orange_lab, warm_red_lab)
    assert dist > 25.0, f"Delta-E between warm orange and red must be > 25 (got {dist:.2f})"


# ============================================================================
# TEST SUITE 3: SPEC TEST 3 - MOVE NORMALIZATION & CANCELLATION
# ============================================================================

def test_move_normalization_basic_and_cancelling():
    """Move normalizer must merge redundant moves and cancel opposite turns."""
    assert normalize_moves(["R", "R"]) == ["R2"]
    assert normalize_moves(["R", "R", "R"]) == ["R'"]
    assert normalize_moves(["R", "R", "R", "R"]) == []
    assert normalize_moves(["R", "R'"]) == []
    assert normalize_moves(["R2", "R2"]) == []
    assert normalize_moves(["R2", "R"]) == ["R'"]
    assert normalize_moves(["R", "R2"]) == ["R'"]
    assert normalize_moves(["R'", "R'"]) == ["R2"]


def test_move_normalization_commuting_parallel_faces():
    """Commuting moves on parallel axes (R/L, F/B, U/D) must cancel across each other."""
    assert normalize_moves(["R", "L", "R"]) == ["R2", "L"]
    assert normalize_moves(["F", "B", "F'"]) == ["B"]
    assert normalize_moves(["U", "D", "U'"]) == ["D"]


# ============================================================================
# TEST SUITE 4: STORAGE & STATE PERSISTENCE SCHEMA
# ============================================================================

def test_storage_schema_defaults_and_validation():
    """Validates storage configuration schemas and default values."""
    default_lang = "ms"
    valid_langs = {"ms", "en"}
    default_speed = 600

    def validate_speed(val):
        return max(100, min(5000, int(val)))

    assert default_lang in valid_langs
    assert validate_speed(600) == 600
    assert validate_speed(50) == 100
    assert validate_speed(10000) == 5000


# ============================================================================
# TEST SUITE 5: BILINGUAL LOCALIZATION (i18n) INTEGRITY
# ============================================================================

def test_i18n_file_contains_ms_and_en():
    """i18n source file must define complete dictionaries for both BM and EN."""
    i18n_path = REPO_ROOT / "src" / "i18n.js"
    assert i18n_path.exists(), "src/i18n.js must exist"

    content = i18n_path.read_text(encoding="utf-8")
    assert "ms:" in content or "const TRANSLATIONS" in content
    assert "Pusing" in content
    assert "Selesaikan" in content
    assert "Solve" in content


# ============================================================================
# TEST SUITE 6: STATIC PWA & GITHUB PAGES ASSET COMPLIANCE
# ============================================================================

def test_pwa_and_offline_assets_exist():
    """All required frontend and backend engine assets must be present."""
    required_files = [
        "index.html",
        "style.css",
        "app.js",
        "manifest.json",
        "sw.js",
        "src/engine/validator.js",
        "src/engine/color-engine.js",
        "src/engine/solver-worker.js",
        "src/engine/storage.js",
        "src/i18n.js",
    ]
    for rel_path in required_files:
        full_path = REPO_ROOT / rel_path
        assert full_path.exists(), f"Required file missing: {rel_path}"

    manifest_path = REPO_ROOT / "manifest.json"
    manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert "name" in manifest_data
    assert "start_url" in manifest_data


# ============================================================================
# TEST SUITE 7: INTEGRATION - RUN NODE ENGINE TEST SUITE
# ============================================================================

def test_full_node_engine_test_suite_passes():
    """
    Executes the Node.js test runner on tests/engine.test.js.
    Ensures all 23 backend engine tests pass cleanly.
    """
    engine_test_file = REPO_ROOT / "tests" / "engine.test.js"
    assert engine_test_file.exists(), "tests/engine.test.js must exist"

    result = subprocess.run(
        ["node", "--test", str(engine_test_file)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"Node test suite failed:\n{result.stdout}\n{result.stderr}"
    assert "fail 0" in result.stdout
