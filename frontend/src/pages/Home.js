import React, { useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  CircularProgress
} from "@mui/material";
import ImageUploader from "../components/ImageUploader";
import DetectionResult from "../components/DetectionResult";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios"; // add axios for API calls

function Home() {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [labels, setLabels] = useState([]); // for class names from backend
  const [loading, setLoading] = useState(false);

  const handleUpload = (file, previewUrl) => {
    setImage(file);
    setImageUrl(previewUrl);
    setBoxes([]);
    setLabels([]);
  };

  const handleDetect = async () => {
    if (!image) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("model_name", "yolov9c"); // optional

      // const res = await axios.post("http://localhost:8000/detect", formData, {
      const res = await axios.post("http://100.85.198.109:8000/detect", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const detections = res.data.detections || [];

      // Convert xyxy -> [x_center, y_center, w, h] for canvas
      const formattedBoxes = detections.map((d) => {
        const { x1, y1, x2, y2 } = d.box;
        const w = x2 - x1;
        const h = y2 - y1;
        const x = x1 + w / 2;
        const y = y1 + h / 2;
        return [x, y, w, h];
      });

      const formattedLabels = detections.map((d) => d.class_name || "");

      setBoxes(formattedBoxes);
      setLabels(formattedLabels);

    } catch (err) {
      console.error("Detection failed:", err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 6,
        px: 2,
        background: "linear-gradient(135deg, #f0f4f8 0%, #d9e4f5 100%)"
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Khmer Letter Detection
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Upload an image and detect Khmer letters instantly.
          </Typography>
        </Box>

        {/* Upload Section */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 4 }}>
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="h6" gutterBottom>
              Step 1: Upload Image
            </Typography>
            <ImageUploader onUpload={handleUpload} />
          </CardContent>
        </Card>

        {/* Detect Button */}
        {image && (
          <Box textAlign="center" mb={4}>
            <Button
              onClick={handleDetect}  // call it here
              variant="contained"
              size="large"
              startIcon={
                loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />
              }
              disabled={loading}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.2,
                backgroundColor: "#1976d2",
                "&:hover": { backgroundColor: "#115293" }
              }}
            >
              {loading ? "Detecting..." : "Run Detection"}
            </Button>

          </Box>
        )}

        {/* Detection Results */}
        {imageUrl && (
          <DetectionResult boxes={boxes} labels={labels} imageUrl={imageUrl} />
        )}
      </Container>
    </Box>
  );
}

export default Home;
