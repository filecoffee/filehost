const express = require("express");
const { uploadFile, getFile } = require("../controllers/file.controller");

const router = express.Router();

router.post("/upload", uploadFile);
router.get("/u/:filename", getFile);

module.exports = router;
