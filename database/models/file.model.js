const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database.config");

const File = sequelize.define("File", {
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  originalFileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  md5: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  labels: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = File;
