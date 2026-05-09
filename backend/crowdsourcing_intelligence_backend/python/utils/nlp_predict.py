import pickle

# Load model
import os
import pickle

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

model_path = os.path.join(BASE_DIR, "nlp", "logistic_model.pkl")
vectorizer_path = os.path.join(BASE_DIR, "nlp", "tfidf_vectorizer.pkl")

model = pickle.load(open(model_path, "rb"))
vectorizer = pickle.load(open(vectorizer_path, "rb"))

def predict_text(text):

    # Transform text
    transformed_text = vectorizer.transform([text])

    # Predict
    prediction = model.predict(transformed_text)[0]

    # Confidence
    confidence = model.predict_proba(transformed_text).max() * 100

    label = "Non_CCI" if prediction == 1 else "CCI"

    return {
        "prediction": label,
        "confidence": round(float(confidence), 2)
    }