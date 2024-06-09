const express = require("express");
const { uploadFile, getFile } = require("../controllers/file.controller");

const router = express.Router();

const apiKeys = process.env.API_KEYS.split(",");
const allowPublicUploads = process.env.ALLOW_PUBLIC ?? false;

const authenticate = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.api;
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

router.get("/files", async (req, res) => {
  const userId = req.session.userId;
  const files = await File.findAll({ where: { userId } });
  res.render("files", { files });
});

module.exports = router;
