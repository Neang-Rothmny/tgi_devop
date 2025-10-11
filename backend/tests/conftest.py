# backend/tests/conftest.py
from fastapi.testclient import TestClient
import pytest
import sys
import types
from importlib import import_module
from pathlib import Path


# Ensure the backend directory is on sys.path so `import app` works
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _install_fake_detector_module():
    """
    Install a lightweight fake 'detector' module into sys.modules BEFORE importing app.py,
    so that `from detector import Detector` pulls this fake and avoids loading YOLO.
    """
    fake_detector = types.ModuleType("detector")

    class _TensorLike:
        """Mimics a tensor with tolist() method"""
        def __init__(self, data):
            self._data = data
        
        def tolist(self):
            return self._data if isinstance(self._data, list) else [self._data]
        
        def __float__(self):
            return float(self._data)
        
        def __int__(self):
            return int(self._data)

    class _SeqWithToList:
        def __init__(self, data):
            self._data = data

        def tolist(self):
            return list(self._data)
        
        def __iter__(self):
            # Wrap each item in _TensorLike so it has .tolist()
            for item in self._data:
                yield _TensorLike(item)

    class _FakeBoxes:
        def __init__(self):
            # Match the new API: xyxy format (x1, y1, x2, y2), conf, cls
            self.xyxy = _SeqWithToList([[10, 20, 40, 60]])  # x1, y1, x2, y2
            self.conf = _SeqWithToList([0.95])  # confidence score
            self.cls = _SeqWithToList([0])  # class id

    class _FakeResult:
        def __init__(self):
            self.boxes = _FakeBoxes()
            self.names = {0: "ក"}  # Fake class names mapping

    class Detector:  # noqa: N801 - match name imported in app.py
        instance = None

        def __new__(cls):
            if cls.instance is None:
                cls.instance = super().__new__(cls)
            return cls.instance

        def _initialize(self):
            # no-op in tests
            pass

        def detection(self, model_name, image):  # signature match
            return _FakeResult()

    fake_detector.Detector = Detector
    sys.modules["detector"] = fake_detector


@pytest.fixture(scope="session")
def client():
    # Install fake detector before importing app
    _install_fake_detector_module()
    app_module = import_module("app")
    return TestClient(app_module.app)
