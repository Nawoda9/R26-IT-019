const db = require("./database/db");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();

app.use(cors());

const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.post("/predict", upload.single("image"), (req, res) => {

    const imagePath = req.file.path;

    exec(`python python/predict.py ${imagePath}`, (error, stdout, stderr) => {

        if (error) {
            console.log(error);
            return res.status(500).send("Prediction Error");
        }

        const result = JSON.parse(stdout);
        db.run(
         `INSERT INTO predictions 
        (imagePath, prediction, confidence)
        VALUES (?, ?, ?)`,

         [
             req.file.path,
             result.prediction,
             result.confidence
         ],

        (err) => {

        if (err) {
            console.log(err.message);
        } else {
            console.log("Prediction Saved");
        }
        }
);

        res.json(result);
    });
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});