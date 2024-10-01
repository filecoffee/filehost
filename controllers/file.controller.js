const express = require("express");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const initializeLocalStorage = require("../engines/local.engine");
const initializeS3Storage = require("../engines/s3.engine");

const app = express();

const storageMode = process.env.STORAGE_MODE || "local";
const fileNameLength = parseInt(process.env.FILE_NAME_LENGTH, 10) || 10;
const multerOptions = {
  limits: parseInt(process.env.FILE_MAX_SIZE_MB, 10) * 1024 * 1024,
};

let storageEngine;

if (storageMode === "local") {
  storageEngine = initializeLocalStorage(
    multerOptions,
    fileNameLength,
    process.env.LOCAL_UPLOAD_PATH,
  );
} else if (storageMode === "s3") {
  const s3Config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.S3_BUCKET_NAME,
    endpoint: process.env.S3_ENDPOINT,
  };
  storageEngine = initializeS3Storage(multerOptions, fileNameLength, s3Config);
} else {
  throw new Error("Invalid STORAGE_MODE");
}

const uploadFile = (req, res) => {
  storageEngine.writeFile(req, res, () => {
    const fileHostDomain =
      process.env.FILEHOST_DOMAIN || `https://${req.get("host")}`;
    res.status(200).json({
      message: "File uploaded successfully",
      url: `${fileHostDomain}/u/${req.filePath}`,
    });
  });
};

const getFile = (req, res) => {
  const filename = req.params.filename;
  storageEngine.findFile(filename, res);
};

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Slow down middleware
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 75, // Allow 75 fast requests per 15 minutes.
  delayMs: (hits) => hits * 100, // Increase delay by 100ms for each request after 5 requests
});

app.use("/u/:filename", limiter, speedLimiter, getFile);

module.exports = { uploadFile, getFile };
