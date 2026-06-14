import cv2
import numpy as np
import base64
import io
import os
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from preprocess import preprocess
from localization import locate_barcode
from correction import correct_and_extract
from decoder import decode_barcode
from supabase_client import SupabaseClient

app = FastAPI(title="EAN-13 Barcode Scanner", version="1.0.0")
db = SupabaseClient()


class ScanResponse(BaseModel):
    success: bool
    barcode: Optional[str] = None
    confidence: Optional[float] = None
    book: Optional[dict] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    supabase_connected: bool = False


def process_frame(frame):
    binary = preprocess(frame)
    rect, box = locate_barcode(frame)
    if rect is None or box is None:
        return None, 0.0, "No barcode detected"
    barcode_img = correct_and_extract(frame, rect, box)
    if barcode_img is None or barcode_img.size == 0:
        return None, 0.0, "Failed to extract barcode region"
    barcode_str, confidence = decode_barcode(barcode_img)
    if barcode_str is None:
        return None, confidence, "Failed to decode barcode"
    return barcode_str, confidence, None


@app.post("/scan", response_model=ScanResponse)
async def scan_image(file: Optional[UploadFile] = File(None),
                     image_data: Optional[str] = Form(None)):
    try:
        if file:
            contents = await file.read()
            np_arr = np.frombuffer(contents, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        elif image_data:
            if image_data.startswith("data:image"):
                image_data = image_data.split(",")[1]
            decoded = base64.b64decode(image_data)
            np_arr = np.frombuffer(decoded, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        else:
            raise HTTPException(status_code=400, detail="No image provided")
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        barcode_str, confidence, error = process_frame(frame)
        if error:
            return ScanResponse(success=False, error=error, confidence=confidence)
        book_data = None
        if db.is_ready():
            book_data = db.lookup_book(barcode_str)
        return ScanResponse(
            success=True,
            barcode=barcode_str,
            confidence=confidence,
            book=book_data
        )
    except HTTPException:
        raise
    except Exception as e:
        return ScanResponse(success=False, error=str(e))


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="running",
        supabase_connected=db.is_ready()
    )


@app.post("/scan-camera")
async def scan_camera():
    from camera import CameraCapture
    cam = CameraCapture(source=0)
    if not cam.start():
        return ScanResponse(success=False, error="Could not open camera")
    import time
    time.sleep(0.5)
    frame = cam.read()
    cam.stop()
    if frame is None:
        return ScanResponse(success=False, error="No frame captured")
    barcode_str, confidence, error = process_frame(frame)
    if error:
        return ScanResponse(success=False, error=error, confidence=confidence)
    book_data = None
    if db.is_ready():
        book_data = db.lookup_book(barcode_str)
    return ScanResponse(
        success=True,
        barcode=barcode_str,
        confidence=confidence,
        book=book_data
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
