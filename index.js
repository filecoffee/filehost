require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const sequelize = require("./config/database.config");
const authRoutes = require("./routes/auth.routes");
const fileRoutes = require("./routes/file.routes");
const helmet = require("helmet");

const app = express();
const port = process.env.PORT;
const hosterEmail = process.env.HOSTER_EMAIL;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(authRoutes);
app.use(fileRoutes);
app.use(helmet());

app.get("/", async (req, res) => {
  const engine =
    process.env.STORAGE_MODE === "s3"
      ? require("./engines/s3.engine")
      : require("./engines/local.engine");

  const { uploads, size } = await engine.gatherStatistics();
  res.render("index", {
    totalUploads: uploads,
    totalSize: size.toFixed(2),
    hosterEmail: hosterEmail,
  });
});

sequelize
  .sync()
  .then(() => {
    app.listen(port, () => {
      console.log("Server is running on port", port);
    });
  })
  .catch((err) => console.log(err));
