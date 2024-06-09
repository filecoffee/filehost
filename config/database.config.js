const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

if (process.env.DIALECT === "sqlite") {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.SQLITE_STORAGE,
    logging: false,
  });
} else {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: process.env.DIALECT,
    logging: false,
  });
}

module.exports = sequelize;
