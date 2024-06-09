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

app.get("/", async (req, res) => {
  const engine =
    process.env.STORAGE_MODE === "s3"
      ? require("./engines/s3.engine")
      : require("./engines/local.engine");

  const { gatherStatistics } = engine;
  const { uploads, size } = await gatherStatistics();
  res.render("index", {
    totalUploads: uploads,
    totalSize: size.toFixed(2),
    hosterEmail: hosterEmail,
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
