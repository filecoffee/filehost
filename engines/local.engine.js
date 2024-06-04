const multer = require("multer");
const path = require("path");
const mime = require("mime-types");
const fs = require("fs");
const { nanoid } = require("nanoid");

const initializeLocalStorage = (multerOptions, fileNameLength, uploadPath) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = mime.extension(file.mimetype);
      const randomName = nanoid(fileNameLength);
      cb(null, `${randomName}.${ext}`);
    },
  });

  const upload = multer({ storage: storage, ...multerOptions });

  const writeFile = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      req.filePath = req.file.filename;
      next();
    });
  };

  const findFile = (filename, res) => {
    const filePath = path.join(uploadPath, filename);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ error: "File not found" });
      }
      res.sendFile(filePath);
    });
  };

  return { writeFile, findFile };
};

module.exports = initializeLocalStorage;
