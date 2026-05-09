import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.resnet50 import preprocess_input
import os

# ------------------------------------------------------------
# Fix for "quantization_config" incompatibility
# ------------------------------------------------------------
from tensorflow.keras import layers

class FlexibleDense(layers.Dense):
    def __init__(self, *args, **kwargs):
        # Remove the problematic argument if present
        kwargs.pop('quantization_config', None)
        super().__init__(*args, **kwargs)

    @classmethod
    def from_config(cls, config):
        # Remove it from the config as well
        config.pop('quantization_config', None)
        return super().from_config(config)

# Register the custom layer so Keras uses it when deserializing 'Dense'
from tensorflow.keras.utils import register_keras_serializable
register_keras_serializable()(FlexibleDense)

custom_objects = {'Dense': FlexibleDense}

# ------------------------------------------------------------
# Load model with custom objects
# ------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# If your file name is "restnet50_model.h5" (with 't'), change the line below:
MODEL_PATH = os.path.join(BASE_DIR, "cnn", "resnet50_model.h5")   # or restnet50_model.h5

model = load_model(MODEL_PATH, custom_objects=custom_objects)

# Class labels – verify the order used in training
class_names = ["CCI", "Non_CCI"]   # swap if necessary

def predict_image(img_path):
    # Load and preprocess image
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = preprocess_input(img_array)
    img_array = np.expand_dims(img_array, axis=0)
    
    # Predict
    predictions = model.predict(img_array)
    
    # For sigmoid output (shape = (1,1))
    prob = float(predictions[0][0])
    print(f"DEBUG - Raw sigmoid probability: {prob:.4f}")
    
    # Decide threshold (0.5)
    if prob > 0.5:
        predicted_class = 1   # class index 1
        confidence = prob * 100
        print(f"DEBUG -> prob > 0.5, using index 1")
    else:
        predicted_class = 0   # class index 0
        confidence = (1 - prob) * 100
        print(f"DEBUG -> prob <= 0.5, using index 0")
    
    return {
        "prediction": class_names[predicted_class],
        "confidence": round(confidence, 2)
    }