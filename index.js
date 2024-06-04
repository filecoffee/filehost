require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const fileRoutes = require("./routes/fileRoutes");

const app = express();
const port = process.env.PORT || 3000;
const apiKeys = process.env.API_KEYS.split(",");
const allowPublicUploads = process.env.ALLOW_PUBLIC_UPLOADS === "true";
const hosterEmail = process.env.HOSTER_EMAIL;

let totalUploads = 0;
let totalSize = 0;

app.set("view engine", "ejs");

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

app.use(authenticate);
app.use(fileRoutes);

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
