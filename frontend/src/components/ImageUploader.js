import React, { useState } from "react";
import { Button, Card, CardContent, Typography, Avatar, Box } from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";

function ImageUploader({ onUpload }) {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onUpload(file, previewUrl);
    }
  };

  return (
    <Box className="home-container">
      <Card sx={{ maxWidth: 400, mx: "auto", p: 2, borderRadius: 3, boxShadow: 4 }}>
        <CardContent sx={{ textAlign: "center" }}>
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
              sx={{ borderRadius: 2, mb: 2 }}
            >
              Upload Image
            </Button>
          </label>

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
        </CardContent>
      </Card>
    </Box>
  );
}

export default ImageUploader;
