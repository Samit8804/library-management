import cv2
import numpy as np


def _sobel_gradient(gray):
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    abs_sobel = np.uint8(np.absolute(sobelx))
    return abs_sobel


def _morphological_operations(edge_image, image_width):
    k = max(7, image_width // 25)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, max(3, k // 4)))
    closed = cv2.morphologyEx(edge_image, cv2.MORPH_CLOSE, kernel)
    k_dilate = max(7, image_width // 20)
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (k_dilate, max(3, k_dilate // 4)))
    dilated = cv2.dilate(closed, kernel_dilate, iterations=2)
    k_erode = max(3, image_width // 80)
    kernel_erode = cv2.getStructuringElement(cv2.MORPH_RECT, (k_erode, max(1, k_erode // 3)))
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
        aspect = max(w, h) / min(w, h)
        area = w * h
        area_ratio = cv2.contourArea(contour) / image_area
        candidates.append((rect, box, area, aspect, area_ratio))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[2], reverse=True)
    for rect, box, area, aspect, area_ratio in candidates:
        if aspect > 2.0 and area > 500 and area_ratio < 0.95:
            return (rect, box, area, aspect, area_ratio)
    for rect, box, area, aspect, area_ratio in candidates:
        if aspect > 1.5 and area > 200 and area_ratio < 0.98:
            return (rect, box, area, aspect, area_ratio)
    return None


def _threshold_edges(edge_image):
    _, binary = cv2.threshold(edge_image, 30, 255, cv2.THRESH_BINARY)
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
    morph_mask = _morphological_operations(binary_edges, w)
    result = _find_barcode_contours(morph_mask, image_area)
    if result is None:
        return None, None
    rect, box, area, aspect, area_ratio = result
    return rect, box
