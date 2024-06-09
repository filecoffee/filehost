const bcrypt = require("bcryptjs");
const User = require("../database/models/user.model");

const authenticate = async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.userId = user.id;
    next();
  } else {
    res.status(401).send("Authentication failed");
  }
};

module.exports = authenticate;
