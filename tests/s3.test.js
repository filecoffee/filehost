const request = require("supertest");
const express = require("express");
const AWS = require("aws-sdk");
const initializeS3Storage = require("../engines/s3.engine");
const { uploadFile, getFile } = require("../controllers/file.controller");

const app = express();
const multerOptions = { limits: { fileSize: 1024 * 1024 } }; // 1MB limit
const publicMulterOptions = { limits: { fileSize: 512 * 1024 } }; // 512KB limit
const fileNameLength = 10;

const s3Config = {
  accessKeyId: "fake-access-key-id",
  secretAccessKey: "fake-secret-access-key",
  region: "fake-region",
  bucketName: "fake-bucket-name",
};

AWS.S3.prototype.upload = jest.fn((params, callback) => {
  callback(null, { Location: `https://fake-s3-url/${params.Key}` });
});

AWS.S3.prototype.getObject = jest.fn((params, callback) => {
  callback(null, {
    ContentType: "text/plain",
    ContentLength: 17,
    Body: Buffer.from("test file content"),
  });
});

const storageEngine = initializeS3Storage(
  multerOptions,
  fileNameLength,
  s3Config,
);

app.post("/upload", (req, res) => {
  storageEngine.writeFile(req, res, () => {
    res.status(200).json({
      message: "File uploaded successfully",
      url: `http://localhost:3000/u/${req.filePath}`,
    });
  });
});

app.get("/u/:filename", (req, res) => {
  storageEngine.findFile(req.params.filename, res);
});

describe("S3 Storage Engine", () => {
  it("should upload a file successfully", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("file", Buffer.from("test file content"), "test.txt")
      .set("x-api-key", "valid-api-key");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("File uploaded successfully");
    expect(response.body.url).toMatch(/http:\/\/localhost:3000\/u\/.+\.txt/);
  });

  it("should retrieve a file successfully", async () => {
    const response = await request(app).get("/u/test.txt");

    expect(response.status).toBe(200);
    expect(response.text).toBe("test file content");
  });
});
