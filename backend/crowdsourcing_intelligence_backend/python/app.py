from flask import Flask, request, jsonify
from flask_cors import CORS
import os

from utils.image_predict import predict_image
from utils.nlp_predict import predict_text

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "temp"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/predict-image", methods=["POST"])
def predict_image_api():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    image_file = request.files["image"]
    image_path = os.path.join(UPLOAD_FOLDER, image_file.filename)
    image_file.save(image_path)
    result = predict_image(image_path)
    return jsonify(result)

@app.route("/predict-text", methods=["POST"])
def predict_text_api():
    data = request.json
    text = data.get("text", "")
    result = predict_text(text)
    return jsonify(result)

@app.route("/predict-all", methods=["POST"])
def predict_all():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    image_file = request.files["image"]
    text = request.form.get("text", "").strip()   # <-- trim whitespace

    image_path = os.path.join(UPLOAD_FOLDER, image_file.filename)
    image_file.save(image_path)

    # CNN Prediction
    image_result = predict_image(image_path)

    # If text is empty after stripping, treat as no text provided
    if text != "":
        text_result = predict_text(text)
        # Combined decision logic
        if image_result["prediction"] == "CCI" or text_result["prediction"] == "CCI":
            final_prediction = "CCI"
        else:
            final_prediction = "Non_CCI"
    else:
        text_result = {
            "prediction": "Not Provided",
            "confidence": 0
        }
        final_prediction = image_result["prediction"]

    return jsonify({
        "image_prediction": image_result,
        "text_prediction": text_result,
        "final_prediction": final_prediction
    })

if __name__ == "__main__":
    app.run(debug=True)