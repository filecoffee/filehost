require("dotenv").config();
const express = require("express");
const fileRoutes = require("./routes/file.routes");
const helmet = require("helmet");
const initializeLocalStorage = require("./engines/local.engine");
const initializeS3Storage = require("./engines/s3.engine");

const app = express();
const port = process.env.PORT;
const hosterEmail = process.env.HOSTER_EMAIL;

const localStorage = initializeLocalStorage({}, 10, "./uploads");
const s3Storage = initializeS3Storage({}, 10, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.AWS_S3_ENDPOINT,
  bucketName: process.env.AWS_S3_BUCKET_NAME,
});

app.set("view engine", "ejs");
app.use(fileRoutes);
app.use(helmet());

app.get("/", async (req, res) => {
  const localStats = localStorage.gatherStatistics();
  const s3Stats = await s3Storage.gatherStatistics();

  const totalUploads = localStats.totalUploads + s3Stats.totalUploads;
  const totalSize = (localStats.totalSize + s3Stats.totalSize) / (1024 * 1024); // Convert to MB

  res.render("index", {
    totalUploads: totalUploads,
    totalSize: totalSize.toFixed(2),
    hosterEmail: hosterEmail,
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
