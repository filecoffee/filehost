const multer = require("multer");
const mime = require("mime-types");
const AWS = require("aws-sdk");
const { nanoid } = require("nanoid");

const initializeS3Storage = (multerOptions, fileNameLength, s3Config) => {
  const s3 = new AWS.S3(s3Config);
  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage, ...multerOptions });

  const writeFile = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const ext = mime.extension(req.file.mimetype);
      const randomName = nanoid(fileNameLength);
      const params = {
        Bucket: s3Config.bucketName,
        Key: `${randomName}.${ext}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      s3.upload(params, (err, data) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        req.filePath = `${randomName}.${ext}`;
        next();
      });
    });
  };

  const findFile = (filename, res) => {
    const params = {
      Bucket: s3Config.bucketName,
      Key: filename,
    };

    s3.getObject(params, (err, data) => {
      if (err) {
        return res.status(404).json({ error: "File not found" });
      }
      res.writeHead(200, {
        "Content-Type": data.ContentType,
        "Content-Length": data.ContentLength,
      });
      res.write(data.Body);
      res.end();
    });
  };

  return { writeFile, findFile };
};

module.exports = initializeS3Storage;
