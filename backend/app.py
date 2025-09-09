# backend/app.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from detector import Detector
from PIL import Image
import io
import numpy as np
import cv2
import time
import base64
import json

app = FastAPI(title="Khmer Letter Detection API", version="1.0")

# Allow frontend calls (React runs on localhost:3000 during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # in production restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load detector once
detector = Detector()

# ------------------- Existing endpoints ------------------- #
@app.get("/health")
def health():
    return {"status": "ok", "model": "yolov9c"}

@app.post("/detect")
async def detect(file: UploadFile = File(...), model_name: str = Form("yolov9c")):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, detail="Invalid image file")

    t0 = time.time()
    result = detector.detection(model_name, image)
    elapsed_ms = (time.time() - t0) * 1000.0

    detections = []
    if result.boxes is not None:
        for box, conf, cls in zip(result.boxes.xyxy, result.boxes.conf, result.boxes.cls):
            x1, y1, x2, y2 = box.tolist()
            detections.append({
                "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "confidence": float(conf),
                "class_id": int(cls),
                "class_name": result.names[int(cls)]
            })

    w, h = image.size
    return {
        "width": w,
        "height": h,
        "detections": detections,
        "inference_ms": round(elapsed_ms, 2)
    }

@app.post("/detect/annotated")
async def detect_annotated(
    file: UploadFile = File(...),
    model_name: str = Form("yolov9c"),
    format: str = Query("jpg", pattern="^(jpg|png|webp)$"),
    quality: int = Query(90, ge=10, le=100)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, detail="Invalid image file")

    result = detector.detection(model_name, image)

    img_np = np.array(image)
    if result.boxes is not None:
        for box, conf, cls in zip(result.boxes.xyxy, result.boxes.conf, result.boxes.cls):
            x1, y1, x2, y2 = map(int, box.tolist())
            cv2.rectangle(img_np, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"{result.names[int(cls)]} {float(conf):.2f}"
            cv2.putText(img_np, label, (x1, max(y1 - 5, 0)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Encode output
    if format == "jpg":
        success, buf = cv2.imencode(".jpg", img_np, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        media = "image/jpeg"
    elif format == "png":
        success, buf = cv2.imencode(".png", img_np)
        media = "image/png"
    else:  # webp
        success, buf = cv2.imencode(".webp", img_np)
        media = "image/webp"

    if not success:
        raise HTTPException(500, detail="Failed to encode image")

    return StreamingResponse(io.BytesIO(buf.tobytes()), media_type=media)

# ------------------- ENDPOINT TO DETECT LETTER AFTER CAPTURE IMAGE ------------------- #
class Base64Image(BaseModel):
    image: str  # base64 encoded string
    model_name: str = "yolov9c"

@app.post("/detect/camera_capture")
async def detect_base64(payload: Base64Image):
    try:
        # Decode base64 string
        image_bytes = base64.b64decode(payload.image)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(400, detail="Invalid base64 image data")

    t0 = time.time()
    result = detector.detection(payload.model_name, image)
    elapsed_ms = (time.time() - t0) * 1000.0

    detections = []
    if result.boxes is not None:
        for box, conf, cls in zip(result.boxes.xyxy, result.boxes.conf, result.boxes.cls):
            x1, y1, x2, y2 = box.tolist()
            detections.append({
                "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "confidence": float(conf),
                "class_id": int(cls),
                "class_name": result.names[int(cls)]
            })

    w, h = image.size
    return {
        "width": w,
        "height": h,
        "detections": detections,
        "inference_ms": round(elapsed_ms, 2)
    }

# ------------------- NEW ENDPOINT TO DETECT IMAGE WITH LIVE CAMERA ------------------- #
@app.websocket("/ws/live_detect")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive data from client
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                b64_image = message.get("image")
                model_name = message.get("model_name", "yolov9c")

                # Decode Base64
                image_bytes = base64.b64decode(b64_image)
                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

                # Run detection
                t0 = time.time()
                result = detector.detection(model_name, image)
                elapsed_ms = (time.time() - t0) * 1000.0

                detections = []
                if result.boxes is not None:
                    for box, conf, cls in zip(result.boxes.xyxy, result.boxes.conf, result.boxes.cls):
                        x1, y1, x2, y2 = box.tolist()
                        detections.append({
                            "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                            "confidence": float(conf),
                            "class_id": int(cls),
                            "class_name": result.names[int(cls)]
                        })

                # Send result back to client
                response = {
                    "width": image.width,
                    "height": image.height,
                    "detections": detections,
                    "inference_ms": round(elapsed_ms, 2)
                }
                await websocket.send_text(json.dumps(response))

            except Exception as e:
                await websocket.send_text(json.dumps({"error": str(e)}))

    except WebSocketDisconnect:
        print("🔌 Client disconnected from WebSocket")
