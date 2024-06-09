const multer = require("multer");
const mime = require("mime-types");
const AWS = require("aws-sdk");
const { nanoid } = require("nanoid");

const initializeS3Storage = (multerOptions, fileNameLength, s3Config) => {
  const s3 = new AWS.S3({
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
    endpoint: s3Config.endpoint,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

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
  const gatherStatistics = async () => {
    let totalUploads = 0;
    let totalSize = 0;

    const listParams = {
      Bucket: s3Config.bucketName,
    };

    const listObjects = async (params) => {
      const data = await s3.listObjectsV2(params).promise();
      data.Contents.forEach((item) => {
        totalUploads++;
        totalSize += item.Size;
      });

      if (data.IsTruncated) {
        params.ContinuationToken = data.NextContinuationToken;
        await listObjects(params);
      }
    };

    await listObjects(listParams);

    return { totalUploads, totalSize };
  };

  return { writeFile, findFile, gatherStatistics };
};

module.exports = initializeS3Storage;
