const express = require("express");
const { uploadFile, getFile } = require("../controllers/file.controller");

const router = express.Router();

const authenticate = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || !apiKeys.includes(apiKey)) {
    if (allowPublicUploads) {
      req.isPublicUpload = true;
      next();
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }
  } else {
    next();
  }
};

router.post("/upload", authenticate, uploadFile);
router.get("/u/:filename", getFile);

module.exports = router;
