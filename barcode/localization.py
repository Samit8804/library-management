import cv2
import numpy as np


def _sobel_gradient(gray):
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    abs_sobel = np.uint8(np.absolute(sobelx))
    return abs_sobel


def _morphological_operations(edge_image):
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 5))
    closed = cv2.morphologyEx(edge_image, cv2.MORPH_CLOSE, kernel)
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 7))
    dilated = cv2.dilate(closed, kernel_dilate, iterations=2)
    kernel_erode = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 3))
    eroded = cv2.erode(dilated, kernel_erode, iterations=1)
    return eroded


def _find_barcode_contours(binary_mask, image_area):
    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for contour in contours:
        rect = cv2.minAreaRect(contour)
        box = cv2.boxPoints(rect)
        box = np.int32(box)
        w = rect[1][0]
        h = rect[1][1]
        if w == 0 or h == 0:
            continue
        aspect_ratio = max(w, h) / min(w, h)
        area = w * h
        area_ratio = cv2.contourArea(contour) / image_area
        candidates.append((rect, box, area, aspect_ratio, area_ratio, contour))
    if not candidates:
        return None
    strict = [c for c in candidates if c[3] > 2.5 and c[2] > 500 and c[4] < 0.95]
    if strict:
        strict.sort(key=lambda x: x[2], reverse=True)
        return strict[0]
    relaxed = [c for c in candidates if c[3] > 1.2 and c[2] > 500 and c[4] < 0.98]
    if relaxed:
        relaxed.sort(key=lambda x: x[2], reverse=True)
        return relaxed[0]
    return None


def _threshold_edges(edge_image):
    _, binary = cv2.threshold(edge_image, 50, 255, cv2.THRESH_BINARY)
    return binary


def locate_barcode(image):
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    h, w = gray.shape
    image_area = h * w
    edges = _sobel_gradient(gray)
    binary_edges = _threshold_edges(edges)
    morph_mask = _morphological_operations(binary_edges)
    result = _find_barcode_contours(morph_mask, image_area)
    if result is None:
        return None, None
    rect, box, area, aspect, area_ratio, contour = result
    return rect, box
