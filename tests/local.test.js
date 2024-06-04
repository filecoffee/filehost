const request = require("supertest");
const express = require("express");
const path = require("path");
const fs = require("fs");
const initializeLocalStorage = require("../engines/local.engine");
const { uploadFile, getFile } = require("../controllers/file.controller");

const app = express();
const uploadPath = path.join(__dirname, "uploads");
const multerOptions = { limits: { fileSize: 1024 * 1024 } }; // 1MB limit
const publicMulterOptions = { limits: { fileSize: 512 * 1024 } }; // 512KB limit
const fileNameLength = 10;

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storageEngine = initializeLocalStorage(
  multerOptions,
  fileNameLength,
  uploadPath,
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

describe("Local Storage Engine", () => {
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
    const filePath = path.join(uploadPath, "test.txt");
    fs.writeFileSync(filePath, "test file content");

    const response = await request(app).get("/u/test.txt");

    expect(response.status).toBe(200);
    expect(response.text).toBe("test file content");
  });
});
