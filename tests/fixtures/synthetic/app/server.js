// FABRICATED test fixture for Handwave. Not real application code.
const express = require("express");
const app = express();

app.post("/api/photos", (req, res) => {
  // Stores the photo in memory only; nothing is persisted.
  photos.push(req.body);
  res.json({ ok: true });
});

app.get("/api/photos", (req, res) => {
  res.json(photos);
});

const photos = [];
module.exports = app;
