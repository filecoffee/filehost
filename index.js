require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const fileRoutes = require("./routes/file.routes");
const helmet = require("helmet");

const app = express();
const port = process.env.PORT;
const apiKeys = process.env.API_KEYS.split(",");
const allowPublicUploads = process.env.ALLOW_PUBLIC_UPLOADS === "true";
const hosterEmail = process.env.HOSTER_EMAIL;

let totalUploads = 0;
let totalSize = 0;

app.set("view engine", "ejs");
app.use(fileRoutes);
app.use(helmet());

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
