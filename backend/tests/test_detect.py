# backend/tests/test_detect.py
from io import BytesIO
from PIL import Image


def _make_image_bytes(size=(50, 50), color=(255, 0, 0)) -> bytes:
    img = Image.new("RGB", size, color)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_detect_endpoint_returns_boxes_and_classes(client):
    img_bytes = _make_image_bytes()

    files = {
        "file": ("test.png", img_bytes, "image/png"),
    }
    data = {
        "model_name": "yolov9c",
    }

    resp = client.post("/detect", files=files, data=data)

    assert resp.status_code == 200
    body = resp.json()

    # Check response structure matches new API
    assert "width" in body and body["width"] == 50
    assert "height" in body and body["height"] == 50
    assert "detections" in body and isinstance(body["detections"], list)
    assert "inference_ms" in body and isinstance(body["inference_ms"], (int, float))

    # From our fake detector we expect one detection
    assert len(body["detections"]) == 1
    detection = body["detections"][0]
    
    assert "box" in detection
    assert detection["box"] == {"x1": 10, "y1": 20, "x2": 40, "y2": 60}
    assert detection["confidence"] == 0.95
    assert detection["class_id"] == 0
    assert detection["class_name"] == "ក"
