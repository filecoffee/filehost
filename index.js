require("dotenv").config();
const express = require("express");
const fileRoutes = require("./routes/file.routes");
const helmet = require("helmet");

const { version } = require("./config/version.config");

const app = express();
const port = process.env.PORT;
const hosterEmail = process.env.HOSTER_EMAIL;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));
app.use(fileRoutes);

const s3 = require("./engines/s3.engine");
const local = require("./engines/local.engine");
const storageMode = process.env.STORAGE_MODE || "local";

// Todo: refactor this way.
const fileNameLength = parseInt(process.env.FILE_NAME_LENGTH, 10) || 10;
const multerOptions = {
  limits: parseInt(process.env.FILE_MAX_SIZE_MB, 10) * 1024 * 1024,
};

app.get("/", async (req, res) => {
  let storageEngine;

  if (storageMode === "local") {
    storageEngine = local(
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
    storageEngine = s3(multerOptions, fileNameLength, s3Config);
  } else {
    throw new Error("Invalid STORAGE_MODE");
  }

  const { totalUploads, totalSize } = await storageEngine.gatherStatistics();

  const kbToMB = totalSize / 1024 / 1024;

  res.render("index", {
    totalUploads: totalUploads,
    totalSize: kbToMB.toFixed(2),
    hosterEmail: hosterEmail,
    version: version,
  });
});

const enableUploadPage = process.env.ENABLE_UPLOAD_PAGE === "true";

app.get("/upload", (req, res) => {
  if (!enableUploadPage) {
    return res.status(404).send("Upload page is disabled.");
  }
  res.render("upload");
});

app.get("/api/config", (req, res) => {
  res.json({
    maxFileSize: parseInt(process.env.FILE_MAX_SIZE_MB, 10) * 1024 * 1024,
    maxFileSizeMB: parseInt(process.env.FILE_MAX_SIZE_MB, 10),
    fileNameLength: parseInt(process.env.FILE_NAME_LENGTH, 10) || 10,
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
