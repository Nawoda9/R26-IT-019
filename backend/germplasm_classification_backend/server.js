require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATABASE_DIR = path.join(__dirname, "database");
const DATABASE_PATH = path.join(DATABASE_DIR, "germplasm.sqlite");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

app.use("/uploads", express.static(UPLOAD_DIR));

const db = new sqlite3.Database(DATABASE_PATH, (error) => {
  if (error) {
    console.error("Database connection failed:", error.message);
  } else {
    console.log("SQLite database connected successfully.");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_name TEXT NOT NULL,
      image_path TEXT NOT NULL,
      predicted_class TEXT NOT NULL,
      confidence REAL NOT NULL,
      model_name TEXT NOT NULL,
      status TEXT DEFAULT 'Pending Verification',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    cb(null, fileName);
  },
});

const fileFilter = function (req, file, cb) {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG, and WEBP image files are allowed."));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

function getPythonCommand() {
  const rawCommand = process.env.PYTHON_CMD || "python";
  const parts = rawCommand.split(" ");

  return {
    command: parts[0],
    args: parts.slice(1),
  };
}

function runPrediction(imagePath) {
  return new Promise((resolve, reject) => {
    const modelPath = path.join(
      __dirname,
      process.env.MODEL_PATH || "models/best_coconut_germplasm_model.h5"
    );

    const classNamesPath = path.join(
      __dirname,
      process.env.CLASS_NAMES_PATH || "models/class_names.json"
    );

    const pythonScriptPath = path.join(__dirname, "python", "predict.py");

    const pythonCommand = getPythonCommand();

    const pythonProcess = spawn(pythonCommand.command, [
      ...pythonCommand.args,
      pythonScriptPath,
      modelPath,
      classNamesPath,
      imagePath,
    ]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", function (data) {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", function (data) {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", function (code) {
      try {
        const lines = output.trim().split("\n");
        const lastLine = lines[lines.length - 1];

        const result = JSON.parse(lastLine);

        if (result.error) {
          reject(new Error(result.error));
          return;
        }

        resolve(result);
      } catch (error) {
        reject(
          new Error(
            `Prediction failed. Exit code: ${code}. Output: ${output}. Error: ${errorOutput}`
          )
        );
      }
    });
  });
}

app.get("/api/health", function (req, res) {
  res.json({
    success: true,
    message: "Germplasm Classification backend is running",
    port: PORT,
  });
});

app.get("/api/db-health", function (req, res) {
  db.get("SELECT datetime('now') AS currentTime", [], function (error, row) {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Database test failed",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "SQLite database is working",
      databaseTime: row.currentTime,
    });
  });
});

app.post("/api/predict", upload.single("image"), async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded.",
      });
    }

    const savedImagePath = req.file.path;

    const prediction = await runPrediction(savedImagePath);

    const predictionStatus =
      prediction.confidence >= 60
        ? "Pending Verification"
        : "Low Confidence - Needs Officer Verification";

    const imageUrl = `/uploads/${req.file.filename}`;

    const insertQuery = `
      INSERT INTO predictions
      (image_name, image_path, predicted_class, confidence, model_name, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [
        req.file.originalname,
        imageUrl,
        prediction.predictedClass,
        prediction.confidence,
        prediction.modelName,
        predictionStatus,
      ],
      function (error) {
        if (error) {
          return res.status(500).json({
            success: false,
            message: "Prediction completed but database save failed.",
            error: error.message,
          });
        }

        return res.json({
          success: true,
          message: "Prediction completed and saved successfully.",
          data: {
            id: this.lastID,
            imageName: req.file.originalname,
            imagePath: imageUrl,
            predictedClass: prediction.predictedClass,
            confidence: prediction.confidence,
            modelName: prediction.modelName,
            status: predictionStatus,
          },
        });
      }
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Prediction failed.",
      error: error.message,
    });
  }
});

app.get("/api/predictions", function (req, res) {
  const selectQuery = `
    SELECT
      id,
      image_name AS imageName,
      image_path AS imagePath,
      predicted_class AS predictedClass,
      confidence,
      model_name AS modelName,
      status,
      created_at AS createdAt
    FROM predictions
    ORDER BY id DESC
  `;

  db.all(selectQuery, [], function (error, rows) {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch prediction records.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  });
});

app.get("/api/predictions/:id", function (req, res) {
  const selectQuery = `
    SELECT
      id,
      image_name AS imageName,
      image_path AS imagePath,
      predicted_class AS predictedClass,
      confidence,
      model_name AS modelName,
      status,
      created_at AS createdAt
    FROM predictions
    WHERE id = ?
  `;

  db.get(selectQuery, [req.params.id], function (error, row) {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch prediction record.",
        error: error.message,
      });
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Prediction record not found.",
      });
    }

    return res.json({
      success: true,
      data: row,
    });
  });
});

app.use(function (error, req, res, next) {
  return res.status(500).json({
    success: false,
    message: error.message || "Internal server error.",
  });
});

const server = app.listen(PORT, function () {
  console.log(`Germplasm backend running on http://localhost:${PORT}`);
});

server.on("error", function (error) {
  console.error("Server error:", error.message);
});