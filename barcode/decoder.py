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
    check = (10 - (total % 10)) % 10
    return check


def validate_checksum(barcode_str):
    if len(barcode_str) != 13:
        return False
    digits = [int(c) for c in barcode_str]
    expected = _calculate_checksum(digits)
    return expected == digits[12]


def decode_zbar(barcode_image):
    try:
        from pyzbar.pyzbar import decode as zbar_decode
        from pyzbar.pyzbar import ZBarSymbol
    except ImportError:
        return None, 0.0
    if barcode_image is None or barcode_image.size == 0:
        return None, 0.0
    gray = barcode_image
    if len(gray.shape) == 3:
        gray = cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)
    results = zbar_decode(gray, symbols=[ZBarSymbol.EAN13, ZBarSymbol.EAN8,
                                          ZBarSymbol.CODE128, ZBarSymbol.CODE39,
                                          ZBarSymbol.QRCODE])
    if results:
        barcode_str = results[0].data.decode('utf-8')
        barcode_str = barcode_str.replace('-', '').replace(' ', '')
        return barcode_str, 90.0
    results = zbar_decode(gray)
    if results:
        barcode_str = results[0].data.decode('utf-8')
        barcode_str = barcode_str.replace('-', '').replace(' ', '')
        return barcode_str, 85.0
    return None, 0.0


def _extract_scanline(binary_image):
    h, w = binary_image.shape[:2]
    lines = []
    offsets = [0, -1, 1, -2, 2]
    for off in offsets:
        y = h // 2 + off
        if 0 <= y < h:
            line = binary_image[y, :]
            if len(line.shape) > 1:
                line = np.mean(line, axis=1)
            lines.append(line)
    if not lines:
        return None
    scanline = np.mean(lines, axis=0)
    return scanline


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
    threshold = otsu_ret
    local_min = np.min(scanline)
    local_max = np.max(scanline)
    if local_max - local_min < 30:
        return None, 0
    bits = (scanline > threshold).astype(np.uint8)
    return bits, int(threshold)


def _find_barcode_span(bits):
    black_indices = np.where(bits == 0)[0]
    if len(black_indices) == 0:
        return None, None
    first_black = int(black_indices[0])
    last_black = int(black_indices[-1])
    span = last_black - first_black + 1
    if span < 30:
        return None, None
    module_width = span / 95.0
    return first_black, module_width


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


def _refine_module_width(bit_str):
    start_guard = bit_str[:3]
    if start_guard != START_GUARD:
        return bit_str
    first_bar_end = bit_str.find('0')
    if first_bar_end > 0:
        pass
    middle = bit_str[45:50]
    if middle == CENTER_GUARD:
        pass
    return bit_str


def _try_decode(bits):
    first_black, module_width = _find_barcode_span(bits)
    if first_black is None:
        return None, 0.0
    bit_str = _sample_modules(bits, first_black, module_width, 95)
    if bit_str is None:
        return None, 0.0
    bit_str = _refine_module_width(bit_str)
    barcode = _decode_from_bit_string(bit_str)
    return barcode, bit_str


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
    end = bit_str[-3:]
    if end != END_GUARD:
        return None
    center = bit_str[45:50]
    if center != CENTER_GUARD:
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
    if not validate_checksum(barcode_str):
        return None
    return barcode_str


def _compute_confidence(barcode_str, bit_str, edge_strength):
    score = 0.0
    if barcode_str and validate_checksum(barcode_str):
        score += 40.0
    if bit_str and len(bit_str) >= 95:
        start_match = sum(1 for a, b in zip(bit_str[:3], START_GUARD) if a == b) / 3
        center_match = sum(1 for a, b in zip(bit_str[45:50], CENTER_GUARD) if a == b) / 5
        end_match = sum(1 for a, b in zip(bit_str[-3:], END_GUARD) if a == b) / 3
        pattern_score = ((start_match + center_match + end_match) / 3) * 20.0
        score += pattern_score
    edge_score = min(edge_strength / 255.0, 1.0) * 20.0
    score += edge_score
    if barcode_str:
        score += 20.0
    return round(score, 1)


def decode_barcode(barcode_image):
    if barcode_image is None or barcode_image.size == 0:
        return None, 0.0
    result, conf = decode_zbar(barcode_image)
    if result:
        return result, max(conf, 80.0)
    if len(barcode_image.shape) == 3:
        gray = cv2.cvtColor(barcode_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = barcode_image.copy()
    edge_strength = _measure_edge_strength(gray)
    scanline = _extract_scanline(gray)
    if scanline is None:
        return None, 0.0
    bits, _ = _scanline_to_bits(scanline)
    if bits is None:
        return None, 0.0
    barcode, bit_str = _try_decode(bits)
    if barcode is None:
        flipped_bits = 1 - bits
        barcode, bit_str = _try_decode(flipped_bits)
    if barcode is None:
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        scanline2 = _extract_scanline(enhanced)
        if scanline2 is not None:
            bits2, _ = _scanline_to_bits(scanline2)
            if bits2 is not None:
                barcode, bit_str = _try_decode(bits2)
                if barcode is None:
                    barcode, bit_str = _try_decode(1 - bits2)
    confidence = _compute_confidence(barcode, bit_str, edge_strength)
    return barcode, confidence


def _measure_edge_strength(gray):
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    abs_sobel = np.abs(sobelx)
    return float(np.mean(abs_sobel))
