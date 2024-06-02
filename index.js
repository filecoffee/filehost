// index.js
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const ejs = require("ejs");

const app = express();
const port = process.env.PORT || 3000;
const storageMode = process.env.STORAGE_MODE || "local";
const apiKeys = process.env.API_KEYS.split(",");
const fileNameLength = parseInt(process.env.FILE_NAME_LENGTH, 10) || 10;
const fileMaxSizeMB = parseInt(process.env.FILE_MAX_SIZE_MB, 10);
const hosterEmail = process.env.HOSTER_EMAIL;

let totalUploads = 0;
let totalSize = 0;

app.set("view engine", "ejs");

const authenticate = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || !apiKeys.includes(apiKey)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

const multerOptions = {
  limits: fileMaxSizeMB === -1 ? {} : { fileSize: fileMaxSizeMB * 1024 * 1024 },
};

let upload;

const initializeUpload = async () => {
  const { nanoid } = await import("nanoid");

  if (storageMode === "local") {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, process.env.LOCAL_UPLOAD_PATH);
      },
      filename: (req, file, cb) => {
        const ext = mime.extension(file.mimetype);
        const randomName = nanoid(fileNameLength);
        cb(null, `${randomName}.${ext}`);
      },
    });
    upload = multer({ storage: storage, ...multerOptions });
  } else if (storageMode === "s3") {
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    const storage = multer.memoryStorage();
    upload = multer({ storage: storage, ...multerOptions });

    app.post("/upload", authenticate, upload.single("file"), (req, res) => {
      const ext = mime.extension(req.file.mimetype);
      const randomName = nanoid(fileNameLength);
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${randomName}.${ext}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      s3.upload(params, (err, data) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        totalUploads++;
        totalSize += req.file.size / (1024 * 1024); // Convert bytes to MB
        res
          .status(200)
          .json({ message: "File uploaded successfully", url: data.Location });
      });
    });
  } else {
    throw new Error("Invalid STORAGE_MODE");
  }

  if (storageMode === "local") {
    app.post("/upload", authenticate, upload.single("file"), (req, res) => {
      totalUploads++;
      totalSize += req.file.size / (1024 * 1024); // Convert bytes to MB
      res
        .status(200)
        .json({ message: "File uploaded successfully", path: req.file.path });
    });

    app.get("/files/:filename", (req, res) => {
      const filePath = path.join(
        __dirname,
        process.env.LOCAL_UPLOAD_PATH,
        req.params.filename,
      );
      res.sendFile(filePath);
    });
  } else if (storageMode === "s3") {
    app.get("/files/:filename", (req, res) => {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: req.params.filename,
      };

      s3.getObject(params, (err, data) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.writeHead(200, {
          "Content-Type": data.ContentType,
          "Content-Length": data.ContentLength,
        });
        res.write(data.Body);
        res.end();
      });
    });
  }

  app.get("/", (req, res) => {
    res.render("index", {
      totalUploads: totalUploads,
      totalSize: totalSize.toFixed(2), // Format to 2 decimal places
      hosterEmail: hosterEmail,
    });
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

initializeUpload();
