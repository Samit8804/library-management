import cv2
import numpy as np

L_CODES = {
    '0': '0001101', '1': '0011001', '2': '0010011', '3': '0111101',
    '4': '0100011', '5': '0110001', '6': '0101111', '7': '0111011',
    '8': '0110111', '9': '0001011'
}
G_CODES = {
    '0': '0100111', '1': '0110011', '2': '0011011', '3': '0100001',
    '4': '0011101', '5': '0111001', '6': '0000101', '7': '0010001',
    '8': '0001001', '9': '0010111'
}
R_CODES = {
    '0': '1110010', '1': '1100110', '2': '1101100', '3': '1000010',
    '4': '1011100', '5': '1001110', '6': '1010000', '7': '1000100',
    '8': '1001000', '9': '1110100'
}
PARITY_PATTERNS = {
    '0': 'OOOOOO', '1': 'OOOGGG', '2': 'OOGOGG', '3': 'OOGGOG',
    '4': 'OOGGGO', '5': 'OGOOGG', '6': 'OGGOGG', '7': 'OGGGOG',
    '8': 'OGGGGO', '9': 'GOOOOG'
}
L_CODE_TO_DIGIT = {v: k for k, v in L_CODES.items()}
G_CODE_TO_DIGIT = {v: k for k, v in G_CODES.items()}
R_CODE_TO_DIGIT = {v: k for k, v in R_CODES.items()}

START_GUARD = '101'
CENTER_GUARD = '01010'
END_GUARD = '101'


def _calculate_checksum(digits):
    odd_sum = sum(digits[i] for i in range(0, 12, 2))
    even_sum = sum(digits[i] for i in range(1, 12, 2))
    total = odd_sum + even_sum * 3
    return (10 - (total % 10)) % 10


def validate_checksum(barcode_str):
    if len(barcode_str) != 13:
        return False
    digits = [int(c) for c in barcode_str]
    return _calculate_checksum(digits) == digits[12]


def _decode_from_bit_string(bit_str):
    if bit_str is None or len(bit_str) < 95:
        return None
    start = bit_str[:3]
    if start != START_GUARD:
        inverted = ''.join('1' if c == '0' else '0' for c in bit_str)
        if inverted[:3] == START_GUARD:
            bit_str = inverted
        else:
            return None
    if bit_str[-3:] != END_GUARD:
        return None
    if bit_str[45:50] != CENTER_GUARD:
        return None
    left_bits = bit_str[3:45]
    right_bits = bit_str[50:92]
    left_digits = []
    used_parities = []
    for i in range(6):
        seg = left_bits[i * 7:(i + 1) * 7]
        if seg in L_CODE_TO_DIGIT:
            left_digits.append(L_CODE_TO_DIGIT[seg])
            used_parities.append('O')
        elif seg in G_CODE_TO_DIGIT:
            left_digits.append(G_CODE_TO_DIGIT[seg])
            used_parities.append('G')
        else:
            return None
    parity_str = ''.join(used_parities)
    first_digit = None
    for d, pat in PARITY_PATTERNS.items():
        if pat == parity_str:
            first_digit = d
            break
    if first_digit is None:
        return None
    right_digits = []
    for i in range(6):
        seg = right_bits[i * 7:(i + 1) * 7]
        if seg in R_CODE_TO_DIGIT:
            right_digits.append(R_CODE_TO_DIGIT[seg])
        else:
            return None
    barcode_str = first_digit + ''.join(left_digits) + ''.join(right_digits)
    return barcode_str if validate_checksum(barcode_str) else None


def _scanline_to_bits(scanline):
    if scanline is None:
        return None, 0
    if scanline.dtype != np.uint8:
        mx = np.max(scanline)
        if mx > 1.0:
            scanline = scanline.astype(np.uint8)
        else:
            scanline = (scanline * 255).astype(np.uint8)
    otsu_ret, _ = cv2.threshold(scanline, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    local_min = np.min(scanline)
    local_max = np.max(scanline)
    if local_max - local_min < 30:
        return None, 0
    return (scanline > otsu_ret).astype(np.uint8), int(otsu_ret)


def _sample_modules(bits, first_black, module_width, num_modules=95):
    if first_black is None or module_width <= 0:
        return None
    n = len(bits)
    window = max(1, int(module_width * 0.4))
    sampled = []
    for i in range(num_modules):
        center = first_black + module_width / 2 + i * module_width
        start = max(0, int(center - window))
        end = min(n, int(center + window) + 1)
        region = bits[start:end]
        if len(region) == 0:
            sampled.append(0)
        else:
            sampled.append(int(np.mean(region) > 0.5))
    return ''.join(str(b) for b in sampled)


def _decode_scanline(bits):
    black = np.where(bits == 0)[0]
    if len(black) < 30:
        return None
    span = int(black[-1]) - int(black[0]) + 1
    if span < 30:
        return None
    module_width = span / 95.0
    bit_str = _sample_modules(bits, int(black[0]), module_width, 95)
    if bit_str is None:
        return None
    return _decode_from_bit_string(bit_str)


def _try_decode_row(gray, y):
    h, w = gray.shape
    if y < 0 or y >= h:
        return None
    scanline = gray[y, :].astype(np.float64)
    otsu_ret, _ = cv2.threshold(scanline.astype(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    bits = (scanline > otsu_ret).astype(np.uint8)
    result = _decode_scanline(bits)
    if result:
        return result
    bits = 1 - bits
    return _decode_scanline(bits)


def decode_full_image(gray):
    h, w = gray.shape
    rows_to_try = set()
    for i in range(20):
        rows_to_try.add(int(h * i / 20))
    for y in sorted(rows_to_try):
        result = _try_decode_row(gray, y)
        if result:
            return result
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    for y in sorted(rows_to_try):
        result = _try_decode_row(enhanced, y)
        if result:
            return result
    for scale in [0.5, 0.75, 1.25, 1.5]:
        scaled = cv2.resize(gray, None, fx=scale, fy=scale)
        s_h, s_w = scaled.shape
        for i in range(10):
            y = int(s_h * i / 10)
            result = _try_decode_row(scaled, y)
            if result:
                return result
    return None


def locate_and_decode(gray):
    h, w = gray.shape
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    edges = np.uint8(np.absolute(sobelx))
    _, binary = cv2.threshold(edges, 40, 255, cv2.THRESH_BINARY)
    k = max(7, w // 20)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, max(3, k // 4)))
    morph = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    morph = cv2.dilate(morph, kernel, iterations=2)
    contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        if cw < 30 or ch < 5:
            continue
        aspect = cw / max(ch, 1)
        if aspect < 1.5:
            continue
        candidates.append((x, y, cw, ch, aspect))
    candidates.sort(key=lambda c: c[2], reverse=True)
    for x, y, cw, ch, aspect in candidates:
        margin_x = int(cw * 0.1)
        margin_y = int(ch * 0.2)
        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(w, x + cw + margin_x)
        y2 = min(h, y + ch + margin_y)
        roi = gray[y1:y2, x1:x2]
        if roi.size == 0:
            continue
        for scale in [1.0, 2.0]:
            if scale > 1:
                scaled_roi = cv2.resize(roi, None, fx=scale, fy=scale)
            else:
                scaled_roi = roi
            for yy in range(0, scaled_roi.shape[0], max(1, scaled_roi.shape[0] // 10)):
                result = _try_decode_row(scaled_roi, yy)
                if result:
                    return result
    return None


def decode_barcode(barcode_image):
    if barcode_image is None or barcode_image.size == 0:
        return None, 0.0
    if len(barcode_image.shape) == 3:
        gray = cv2.cvtColor(barcode_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = barcode_image.copy()
    edge_strength = _measure_edge_strength(gray)
    barcode_str = decode_full_image(gray)
    confidence = 0.0
    if barcode_str:
        confidence = min(80.0, 30.0 + edge_strength / 10.0)
        return barcode_str, round(confidence, 1)
    barcode_str = locate_and_decode(gray)
    if barcode_str:
        confidence = min(70.0, 20.0 + edge_strength / 10.0)
        return barcode_str, round(confidence, 1)
    return None, 0.0


def decode_full_frame(frame):
    if frame is None or frame.size == 0:
        return None, 0.0
    if len(frame.shape) == 3:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    else:
        gray = frame.copy()
    edge_strength = _measure_edge_strength(gray)
    barcode_str = decode_full_image(gray)
    if barcode_str:
        confidence = min(80.0, 30.0 + edge_strength / 10.0)
        return barcode_str, round(confidence, 1)
    barcode_str = locate_and_decode(gray)
    if barcode_str:
        confidence = min(70.0, 20.0 + edge_strength / 10.0)
        return barcode_str, round(confidence, 1)
    return None, 0.0


def _measure_edge_strength(gray):
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    return float(np.mean(np.abs(sobelx)))
