import cv2
import numpy as np
from decoder import (
    L_CODES, G_CODES, R_CODES, PARITY_PATTERNS,
    START_GUARD, CENTER_GUARD, END_GUARD,
    validate_checksum, _calculate_checksum, decode_barcode
)
from preprocess import preprocess


def generate_ean13_barcode(barcode_str, height=200, module_width=3, margin=20):
    if len(barcode_str) != 13:
        raise ValueError("EAN-13 barcode must be 13 digits")
    digits = list(barcode_str)
    first_digit = digits[0]
    left_digits = digits[1:7]
    right_digits = digits[7:13]
    parity = PARITY_PATTERNS[first_digit]
    encoded = START_GUARD
    for i, d in enumerate(left_digits):
        if parity[i] == 'O':
            encoded += L_CODES[d]
        else:
            encoded += G_CODES[d]
    encoded += CENTER_GUARD
    for d in right_digits:
        encoded += R_CODES[d]
    encoded += END_GUARD
    total_modules = len(encoded)
    pixel_width = total_modules * module_width + 2 * margin
    pixel_height = height + 2 * margin
    image = np.ones((pixel_height, pixel_width), dtype=np.uint8) * 255
    for i, bit in enumerate(encoded):
        if bit == '1':
            x_start = margin + i * module_width
            image[margin:margin + height, x_start:x_start + module_width] = 0
    return image


def _add_noise(image, noise_level=0.05):
    noisy = image.copy()
    h, w = noisy.shape
    num_noise = int(h * w * noise_level)
    y_coords = np.random.randint(0, h, num_noise)
    x_coords = np.random.randint(0, w, num_noise)
    noisy[y_coords, x_coords] = 255 - noisy[y_coords, x_coords]
    return noisy


def _rotate_image(image, angle):
    h, w = image.shape
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    nw = int((h * sin) + (w * cos))
    nh = int((h * cos) + (w * sin))
    M[0, 2] += nw / 2 - center[0]
    M[1, 2] += nh / 2 - center[1]
    rotated = cv2.warpAffine(image, M, (nw, nh), borderValue=255)
    return rotated


def _add_blur(image, ksize=5):
    return cv2.GaussianBlur(image, (ksize, ksize), 0)


def _adjust_brightness(image, factor=1.5):
    img = image.astype(np.float32) * factor
    return np.clip(img, 0, 255).astype(np.uint8)


def run_tests():
    print("=" * 60)
    print("EAN-13 Barcode Decoder Test Suite")
    print("=" * 60)
    test_cases = [
        ("9780134685991", "Perfect barcode", {}),
        ("9780134685991", "Rotated +15 deg", {"rotate": 15}),
        ("9780134685991", "Rotated -25 deg", {"rotate": -25}),
        ("9780134685991", "With noise", {"noise": 0.03}),
        ("9780134685991", "With blur", {"blur": 3}),
        ("9780134685991", "Bright lighting", {"brightness": 1.8}),
        ("9780134685991", "Dim lighting", {"brightness": 0.5}),
        ("5901234123457", "Test barcode 2", {}),
        ("4012345678901", "Test barcode 3", {}),
    ]
    passed = 0
    failed = 0
    for barcode_str, description, params in test_cases:
        img = generate_ean13_barcode(barcode_str)
        if "noise" in params:
            img = _add_noise(img, params["noise"])
        if "blur" in params:
            img = _add_blur(img, params["blur"])
        if "brightness" in params:
            img = _adjust_brightness(img, params["brightness"])
        if "rotate" in params:
            img = _rotate_image(img, params["rotate"])
        rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        result, confidence = decode_barcode(rgb)
        status = "PASS" if result == barcode_str else "FAIL"
        if status == "PASS":
            passed += 1
        else:
            failed += 1
        print(f"[{status}] {description:25s} | Expected: {barcode_str} | Got: {str(result):13s} | Confidence: {confidence:5.1f}%")
    print("-" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    return passed, failed


def test_checksum():
    print("\n" + "=" * 60)
    print("Checksum Validation Tests")
    print("=" * 60)
    tests = [
        ("9780134685991", True),
        ("5901234123457", True),
        ("4012345678901", True),
        ("9780134685990", False),
        ("1234567890128", True),
        ("1234567890120", False),
    ]
    passed = 0
    for barcode, expected in tests:
        result = validate_checksum(barcode)
        status = "PASS" if result == expected else "FAIL"
        if status == "PASS":
            passed += 1
        print(f"[{status}] {barcode} -> valid={result} (expected={expected})")
    print(f"Checksum tests: {passed}/{len(tests)} passed")


if __name__ == "__main__":
    test_checksum()
    print()
    run_tests()
