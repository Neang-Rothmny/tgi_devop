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

    # From our fake detector we expect one box and one class id
    assert "boxes" in body and isinstance(body["boxes"], list)
    assert "classes" in body and isinstance(body["classes"], list)
    assert body["boxes"] == [[10, 20, 30, 40]]
    assert body["classes"] == [0]
