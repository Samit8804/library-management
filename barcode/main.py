import cv2
import numpy as np
import base64
import os
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from decoder import decode_full_frame

app = FastAPI(title="Barcode Scanner", version="1.0.0")

origins_str = os.getenv("CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,https://library-management-flame-iota.vercel.app")
origins = [o.strip() for o in origins_str.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = None
try:
    from supabase_client import SupabaseClient
    db = SupabaseClient()
except Exception as e:
    print(f"Supabase not configured: {e}")


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
    h, w = frame.shape[:2]
    if w > 1280 or h > 960:
        scale = min(1280 / w, 960 / h)
        frame = cv2.resize(frame, None, fx=scale, fy=scale)
    barcode_str, confidence = decode_full_frame(frame)
    if barcode_str:
        return barcode_str, confidence, None
    return None, 0.0, "No barcode detected"


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
        if db and db.is_ready():
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
    return HealthResponse(status="running", supabase_connected=db is not None and db.is_ready())


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
