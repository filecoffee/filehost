const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../database/models/user.model");
const authenticate = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  await User.create({ username, password: hashedPassword });
  res.redirect("/login");
});

router.post("/login", authenticate, (req, res) => {
  res.redirect("/dashboard");
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

module.exports = router;
