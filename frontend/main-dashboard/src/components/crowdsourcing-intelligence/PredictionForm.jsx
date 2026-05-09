import { useState } from "react";
import axios from "axios";
import "./PredictionForm.css";

function PredictionForm() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const symptomsList = [
    "Small worms/caterpillars visible on leaves",
    "White web or thread-like material under leaves",
    "Coconut leaves look dry or burnt",
    "Brown patches or spots on leaves",
    "Leaves are being eaten or damaged",
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCheckboxChange = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter((item) => item !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      alert("Please upload an image");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);

      const hasSymptoms = selectedSymptoms.length > 0;
      const hasDescription = description.trim() !== "";

      if (hasSymptoms || hasDescription) {
        const finalText = `
          Symptoms: ${selectedSymptoms.join(", ")}
          Description: ${description}
        `;
        formData.append("text", finalText);
      } else {
        formData.append("text", "");
      }

      const response = await axios.post(
        "http://localhost:5000/predict-all",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setResult(response.data);
    } catch (error) {
      console.log(error);
      alert("Prediction failed");
    }

    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="prediction-card">
        <h1 className="main-title">Coconut Caterpillar Infestation Detection</h1>
        <p className="subtitle">
          Upload a coconut leaf image and select visible symptoms for AI-based detection.
        </p>

        <form onSubmit={handleSubmit} className="prediction-form">
          {/* Upload Section */}
          <div className="section">
            <label className="section-title">Upload Coconut Leaf Image</label>
            <div className="upload-box">
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </div>
          </div>

          {/* Image Preview */}
          {preview && (
            <div className="image-preview-container">
              <img src={preview} alt="Preview" className="image-preview" />
            </div>
          )}

          {/* Symptoms */}
          <div className="section">
            <label className="section-title">Symptoms</label>
            <div className="checkbox-group">
              {symptomsList.map((symptom, index) => (
                <label key={index} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.includes(symptom)}
                    onChange={() => handleCheckboxChange(symptom)}
                  />
                  <span>{symptom}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Description */}
          <div className="section">
            <label className="section-title">Additional Description (Optional)</label>
            <textarea
              className="text-input"
              placeholder="Enter additional farmer description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Predict Button */}
          <button type="submit" className="predict-btn">
            {loading ? "Predicting..." : "Detect Infestation"}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="result-card">
            <h2>Prediction Results</h2>
            <div className="result-grid">
              <div className="result-item">
                <span>Image Prediction</span>
                <strong>{result.image_prediction.prediction}</strong>
              </div>
              <div className="result-item">
                <span>Image Confidence</span>
                <strong>{result.image_prediction.confidence}%</strong>
              </div>
              {result.text_prediction &&
                result.text_prediction.prediction !== "Not Provided" && (
                  <>
                    <div className="result-item">
                      <span>Text Prediction</span>
                      <strong>{result.text_prediction.prediction}</strong>
                    </div>
                    <div className="result-item">
                      <span>Text Confidence</span>
                      <strong>{result.text_prediction.confidence}%</strong>
                    </div>
                  </>
                )}
            </div>

            {/* Final Prediction */}
            <div
              className={`final-result ${
                result.final_prediction === "CCI" ? "danger-result" : "safe-result"
              }`}
            >
              Final Prediction: {result.final_prediction}
            </div>

            {/* Crowdsourced Platform Button - placed after final prediction */}
            <div className="crowdsource-btn-container">
              <button
                type="button"
                className="crowdsource-btn"
                onClick={() => window.location.href = "/crowdsource"}  // change URL as needed
              >
                To the Crowdsourced Platform →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PredictionForm;