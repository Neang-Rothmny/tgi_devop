# backend/detector.py
from ultralytics import YOLO
import numpy as np
from PIL import Image

class Detector:
    instance = None

    def __new__(cls):
        if cls.instance is None:
            cls.instance = super(Detector, cls).__new__(cls)
            cls.instance._initialize()
        return cls.instance

    def _initialize(self):
        # Load models once
        self.models = {
            "yolov9c": YOLO("models/yolov9c_100epoch.pt"),  # put your model file here
        }

    def detection(self, model_name, image):
        # Convert to grayscale if needed
        img = Image.fromarray(np.array(image))
        img = img.convert("L")

        result = self.models[model_name](img)
        return result[0]
