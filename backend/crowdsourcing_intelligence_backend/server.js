require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const { Sequelize, DataTypes } = require("sequelize");

const app = express();

app.use(cors());
app.use(express.json());


// ================= DATABASE =================

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database/database.sqlite",
});

// Report Table
const Report = sequelize.define("Report", {
  imagePath: DataTypes.STRING,
  textReport: DataTypes.TEXT,

  imagePrediction: DataTypes.STRING,
  imageConfidence: DataTypes.FLOAT,

  textPrediction: DataTypes.STRING,
  textConfidence: DataTypes.FLOAT,

  finalPrediction: DataTypes.STRING,
});


// ================= MULTER =================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });


// ================= ROUTES =================

app.get("/", (req, res) => {
  res.send("Backend Running");
});


// Prediction Route
app.post("/predict", upload.single("image"), async (req, res) => {

  try {

    const text = req.body.text;

    // Prepare form-data for Flask
    const formData = new FormData();

    formData.append("image", fs.createReadStream(req.file.path));

    formData.append("text", text);

    // Send to Flask API
    const flaskResponse = await axios.post(
      `${process.env.FLASK_API}/predict-all`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    const result = flaskResponse.data;

    // Save to SQLite
    const savedReport = await Report.create({
      imagePath: req.file.path,
      textReport: text,

      imagePrediction: result.image_prediction.prediction,
      imageConfidence: result.image_prediction.confidence,

      textPrediction: result.text_prediction.prediction,
      textConfidence: result.text_prediction.confidence,

      finalPrediction: result.final_prediction,
    });

    res.json(savedReport);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Prediction failed",
    });
  }
});


// ================= START SERVER =================

sequelize.sync().then(() => {

  app.listen(process.env.PORT, () => {

    console.log(`Server running on port ${process.env.PORT}`);

  });

});