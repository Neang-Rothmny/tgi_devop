import React, { useState, useRef, useEffect } from "react";
import DetectionResult from "./DetectionResult";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Stack,
  Alert,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import StopIcon from "@mui/icons-material/Stop";
import VideocamIcon from "@mui/icons-material/Videocam";

function ImageUploader({ onUpload, onLiveData }) {
  const [preview, setPreview] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null); // base64 or blob URL
  const [detections, setDetections] = useState([]); // array of detection objects
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const liveDetectionTimerRef = useRef(null);


  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onUpload(file, previewUrl);
    }
  };

  // Try to start camera
  // Start camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((d) => d.kind === "videoinput");
      if (!hasCamera) {
        setCameraError("No camera device found.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setIsCameraOn(true);

      // Wait for the <video> element to actually appear in the DOM
      const checkVideoInterval = setInterval(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          clearInterval(checkVideoInterval);
        }
      }, 50);
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Please allow access and try again.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found on your device.");
      } else {
        setCameraError("Unable to access camera. Please check browser permissions.");
      }
    }
  };


  // Stop camera
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setIsCameraOn(false);
  };

  // // Draw bounding box
  const drawDetections = (detections, width, height) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Draw video frame first
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";
    ctx.fillStyle = "lime";

    detections.forEach((det) => {
      const { x1, y1, x2, y2 } = det.box;

      const scaleX = canvas.width / width;
      const scaleY = canvas.height / height;

      ctx.strokeRect(x1 * scaleX, y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY);
      ctx.fillText(
        `${det.class_name} ${det.confidence.toFixed(2)}`,
        x1 * scaleX,
        Math.max(y1 * scaleY - 5, 0)
      );
    });
  };



  // Capture frame and send to backend
  // const captureAndSend = async () => {
  //   if (!videoRef.current) return;
  //   const canvas = canvasRef.current;
  //   const context = canvas.getContext("2d");
  //   context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

  //   let base64Image = canvas.toDataURL("image/jpeg");
  //   base64Image = base64Image.split(",")[1]; // <-- remove prefix

  //   try {
  //     const res = await fetch("http://localhost:8000/detect/camera_capture", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ image: base64Image }),
  //     });
  //     const data = await res.json();
  //     onLiveData && onLiveData(data);
  //   } catch (err) {
  //     console.error("Camera capture failed:", err);
  //     setCameraError("Failed to send captured image for detection.");
  //   }
  // };
  const captureAndSend = async () => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Draw current frame from video
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Convert to Blob (so it behaves like a file)
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], "captured_image.png", { type: "image/png" });
      const previewUrl = URL.createObjectURL(file);

      // 🔁 Forward captured image to same upload handler
      onUpload(file, previewUrl);

      // Optional: update local preview if you want to see it before detection
      setPreview(previewUrl);
    }, "image/png");
  };





  // WebSocket live detection
  const startLiveDetection = () => {
    if (wsRef.current) return; // already running

    const ws = new WebSocket("ws://localhost:8000/ws/live_detect");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to live detection WebSocket");
      setIsLive(true);

      // Start sending frames every N milliseconds
      const sendFrame = () => {
        if (!wsRef.current || !videoRef.current || !isLive) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL("image/png").split(",")[1];
        wsRef.current.send(JSON.stringify({ image: base64Image, model_name: "yolov9c" }));

        liveDetectionTimerRef.current = setTimeout(sendFrame, 200); // store timer
      };
      sendFrame(); // start loop
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        console.error("Live detection error:", data.error);
        return;
      }

      // Draw detections on canvas
      setCapturedImage(canvasRef.current.toDataURL("image/png"));
      setDetections(data.detections);

    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setCameraError("Live detection connection error.");
    };

    ws.onclose = () => {
      console.log("Live detection stopped");
      setIsLive(false);
      wsRef.current = null;
    };
  };

  const stopLiveDetection = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (liveDetectionTimerRef.current) {
      clearTimeout(liveDetectionTimerRef.current);
      liveDetectionTimerRef.current = null;
    }

    setIsLive(false);
  };



  // Cleanup when unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopLiveDetection();
    };
  }, []);

  return (
    <Box>
      <Card sx={{ maxWidth: 450, mx: "auto", p: 2, borderRadius: 3, boxShadow: 4 }}>
        <CardContent sx={{ textAlign: "center" }}>
          <Stack spacing={2} alignItems="center">
            {/* Upload Image */}
            <input
              accept="image/*"
              id="upload-button-file"
              type="file"
              hidden
              onChange={handleFileChange}
            />
            <label htmlFor="upload-button-file">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ borderRadius: 2 }}
              >
                Upload Image
              </Button>
            </label>

            {/* Camera Controls */}
            {!isCameraOn ? (
              <Button
                variant="outlined"
                startIcon={<CameraAltIcon />}
                onClick={startCamera}
              >
                Open Camera
              </Button>
            ) : (
              <Button
                color="error"
                variant="outlined"
                startIcon={<StopIcon />}
                onClick={stopCamera}
              >
                Stop Camera
              </Button>
            )}

            {/* Camera Error Message */}
            {cameraError && (
              <Alert
                severity="error"
                onClose={() => setCameraError(null)}
                sx={{ width: "100%" }}
              >
                {cameraError}
              </Alert>
            )}

            {/* Camera Preview */}
            {isCameraOn && (
              <Box>
                <video
                  ref={videoRef}
                  autoPlay
                  width="320"
                  height="240" // smaller for preview
                  style={{
                    borderRadius: 10,
                    border: "2px solid #ccc",
                    marginBottom: 8,
                    display: isCameraOn ? "block" : "none"
                  }}
                />
                <canvas ref={canvasRef} width="640" height="480" hidden /> {/* high-res for capture */}


                <Button
                  variant="contained"
                  color="primary"
                  onClick={captureAndSend}
                  startIcon={<VideocamIcon />}
                >
                  Capture Image
                </Button>
              </Box>
            )}

            {capturedImage && detections.length > 0 && (
              <DetectionResult
                imageUrl={capturedImage || preview}
                boxes={
                  detections.length > 0
                    ? detections.map(det => {
                        const { x1, y1, x2, y2 } = det.box;
                        return [x1, y1, x2 - x1, y2 - y1];
                      })
                    : []
                }
                labels={detections.map(det => det.class_name)}
              />

            )}

            {/* Live Detection Buttons */}
            {!isLive ? (
              <Button
                variant="contained"
                color="success"
                onClick={startLiveDetection}
              >
                Start Live Detection
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={stopLiveDetection}
              >
                Stop Live Detection
              </Button>
            )}

            {/* Image Preview */}
            {preview ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Preview
                </Typography>
                <Avatar
                  src={preview}
                  alt="preview"
                  variant="rounded"
                  sx={{
                    width: "100%",
                    height: 200,
                    borderRadius: 3,
                    objectFit: "cover",
                  }}
                />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No image selected
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ImageUploader;
