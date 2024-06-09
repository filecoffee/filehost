require("dotenv").config();
const express = require("express");
const fileRoutes = require("./routes/file.routes");
const helmet = require("helmet");

const app = express();
const port = process.env.PORT;
const hosterEmail = process.env.HOSTER_EMAIL;

app.set("view engine", "ejs");
app.use(fileRoutes);
app.use(helmet());

const s3 = require("./engines/s3.engine");
const local = require("./engines/local.engine");
const storageMode = process.env.STORAGE_MODE || "local";

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

  const { uploads, size } = await storageEngine.gatherStatistics();
  res.render("index", {
    totalUploads: uploads,
    totalSize: size.toFixed(2),
    hosterEmail: hosterEmail,
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
