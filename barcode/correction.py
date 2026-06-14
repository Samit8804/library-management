import cv2
import numpy as np


def correct_rotation(image, rect):
    rows, cols = image.shape[:2]
    angle = rect[2]
    w, h = rect[1]
    if angle < -45:
        angle = 90 + angle
        w, h = h, w
    center = rect[0]
    rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, rotation_matrix, (cols, rows),
                              flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated, angle


def extract_barcode_region(image, box, margin=20):
    x, y, w, h = cv2.boundingRect(box)
    x = max(0, x - margin)
    y = max(0, y - margin)
    w = min(image.shape[1] - x, w + 2 * margin)
    h = min(image.shape[0] - y, h + 2 * margin)
    cropped = image[y:y + h, x:x + w]
    return cropped


def correct_perspective(image, box):
    rect = cv2.minAreaRect(box)
    w, h = rect[1]
    w = max(w, h) if w < h else w
    h = min(w, h) if w < h else h
    box_pts = cv2.boxPoints(rect)
    box_pts = np.int32(box_pts)
    src_pts = box_pts.astype(np.float32)
    dst_pts = np.array([
        [0, 0],
        [w - 1, 0],
        [w - 1, h - 1],
        [0, h - 1]
    ], dtype=np.float32)
    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(image, M, (int(w), int(h)),
                                  flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return warped


def correct_and_extract(image, rect, box):
    rotated, angle = correct_rotation(image, rect)
    roi = extract_barcode_region(rotated, box)
    if roi.shape[0] > 0 and roi.shape[1] > 0:
        roi_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi
        _, roi_binary = cv2.threshold(roi_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return roi_binary
    return roi
