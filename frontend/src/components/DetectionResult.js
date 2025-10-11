import React, { useEffect, useRef } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

function DetectionResult({ boxes, labels, imageUrl }) { // <-- add labels prop
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imageUrl || boxes.length === 0) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Resize canvas to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw boxes + labels
      ctx.strokeStyle = "#ff1744"; // red accent
      ctx.lineWidth = 2;
      ctx.font = "16px Arial";
      ctx.fillStyle = "#ff1744";

      boxes.forEach(([x, y, w, h], i) => {
        const x1 = x - w / 2;
        const y1 = y - h / 2;

        // Draw bounding box
        ctx.strokeRect(x1, y1, w, h);

        // Draw label text
        if (labels && labels[i]) {
          ctx.fillText(labels[i], x1, Math.max(y1 - 5, 15));
        }
      });
    };
  }, [boxes, labels, imageUrl]); // <-- add labels dependency

  if (!imageUrl) return null;

  return (
    <Card
      sx={{
        maxWidth: 800,
        mx: "auto",
        mt: 4,
        borderRadius: 3,
        boxShadow: 4,
      }}
    >
      <CardContent>
        <Typography
          variant="h6"
          align="center"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          Detection Result
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "auto",
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            p: 1,
            backgroundColor: "#fafafa",
          }}
        >
          <canvas
            ref={canvasRef}
            className="result-canvas"
            style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

export default DetectionResult;
