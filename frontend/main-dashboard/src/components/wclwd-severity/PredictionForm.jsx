import { useState } from "react";
import axios from "axios";
import "./PredictionForm.css";

function PredictionForm() {

    const [image, setImage] = useState(null);

    const [prediction, setPrediction] = useState("");

    const [confidence, setConfidence] = useState("");

    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleSubmit = async () => {

        if (!image) {
            alert("Please select an image");
            return;
        }

        const formData = new FormData();

        formData.append("image", image);

        try {

            setLoading(true);

            const response = await axios.post(
                "http://localhost:5000/predict",
                formData
            );

            setPrediction(response.data.prediction);

            setConfidence(response.data.confidence);

        } catch (error) {

            console.log(error);

            alert("Prediction failed");

        } finally {

            setLoading(false);
        }
    };

    return (

        <div className="prediction-container">

        <h2 className="prediction-title">
            WCLWD Disease Prediction
        </h2>

        <input
    className="file-input"
    type="file"
    accept="image/*"
    onChange={(e) => {

        const file = e.target.files[0];

        setImage(file);

        if (file) {
            setPreview(URL.createObjectURL(file));
        }
    }}
/>

{preview && (
    <img
        src={preview}
        alt="Preview"
        className="preview-image"
    />
)}

        <br /><br />

        <button
            className="predict-button"
            onClick={handleSubmit}
        >
            Predict Disease
        </button>

        {loading && (
            <h3 className="loading-text">
                Predicting...
            </h3>
        )}

        {prediction && (
            <div className="result-box">

                <h3 className="result-title">
                    Prediction Result
                </h3>

                <p className="result-text">
                    <strong>Disease:</strong> {prediction}
                </p>

                <p className="result-text">
                    <strong>Confidence:</strong> {confidence}%
                </p>

            </div>
        )}

    </div>
    );
}

export default PredictionForm;