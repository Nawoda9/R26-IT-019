import sys
import json
import os
import tempfile
import numpy as np
from PIL import Image
import tensorflow as tf
import h5py

IMG_SIZE = (224, 224)


def remove_key_recursive(obj, key_to_remove):
    if isinstance(obj, dict):
        obj.pop(key_to_remove, None)

        for value in obj.values():
            remove_key_recursive(value, key_to_remove)

    elif isinstance(obj, list):
        for item in obj:
            remove_key_recursive(item, key_to_remove)


def decode_h5_attribute(value):
    if isinstance(value, bytes):
        return value.decode("utf-8")

    if hasattr(value, "decode"):
        return value.decode("utf-8")

    return value


def create_compatible_h5_model(original_model_path):
    """
    Creates a temporary compatible .h5 model file by removing unsupported
    Keras config keys such as quantization_config.
    """
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".h5")
    temp_model_path = temp_file.name
    temp_file.close()

    with h5py.File(original_model_path, "r") as source_file:
        with h5py.File(temp_model_path, "w") as target_file:
            # Copy all groups/datasets
            for key in source_file.keys():
                source_file.copy(key, target_file)

            # Copy all attributes
            for key, value in source_file.attrs.items():
                target_file.attrs[key] = value

            # Clean model_config attribute
            if "model_config" in source_file.attrs:
                model_config = decode_h5_attribute(source_file.attrs["model_config"])
                model_config_json = json.loads(model_config)

                remove_key_recursive(model_config_json, "quantization_config")

                cleaned_config = json.dumps(model_config_json)
                target_file.attrs["model_config"] = cleaned_config

    return temp_model_path


def load_model_safely(model_path):
    try:
        return tf.keras.models.load_model(model_path, compile=False)

    except Exception as first_error:
        if "quantization_config" not in str(first_error):
            raise first_error

        compatible_model_path = create_compatible_h5_model(model_path)

        try:
            return tf.keras.models.load_model(compatible_model_path, compile=False)

        finally:
            if os.path.exists(compatible_model_path):
                os.remove(compatible_model_path)


def load_class_names(class_names_path):
    with open(class_names_path, "r") as file:
        data = json.load(file)

    # Format 1: {"Dwarf": 0, "Tall": 1}
    if isinstance(data, dict):
        return {int(value): key for key, value in data.items()}

    # Format 2: ["Dwarf", "Tall"]
    if isinstance(data, list):
        return {index: name for index, name in enumerate(data)}

    raise ValueError("Invalid class_names.json format")


def preprocess_image(image_path):
    image = Image.open(image_path).convert("RGB")
    image = image.resize(IMG_SIZE)

    image_array = np.array(image).astype("float32")
    image_array = np.expand_dims(image_array, axis=0)

    return image_array


def predict_image(model_path, class_names_path, image_path):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")

    if not os.path.exists(class_names_path):
        raise FileNotFoundError(f"Class names file not found: {class_names_path}")

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    class_names = load_class_names(class_names_path)

    model = load_model_safely(model_path)

    image_array = preprocess_image(image_path)

    predictions = model.predict(image_array, verbose=0)
    predictions = np.array(predictions)

    # Binary sigmoid output example: [[0.82]]
    if predictions.shape[-1] == 1:
        score = float(predictions[0][0])
        predicted_index = 1 if score >= 0.5 else 0
        confidence = score if predicted_index == 1 else 1 - score

    # Softmax output example: [[0.20, 0.80]]
    else:
        predicted_index = int(np.argmax(predictions[0]))
        confidence = float(np.max(predictions[0]))

    predicted_class = class_names.get(predicted_index, f"Class {predicted_index}")

    return {
        "predictedClass": predicted_class,
        "confidence": round(confidence * 100, 2),
        "modelName": "Custom CNN"
    }


if __name__ == "__main__":
    try:
        if len(sys.argv) != 4:
            raise ValueError(
                "Usage: python predict.py <model_path> <class_names_path> <image_path>"
            )

        model_path = sys.argv[1]
        class_names_path = sys.argv[2]
        image_path = sys.argv[3]

        result = predict_image(model_path, class_names_path, image_path)
        print(json.dumps(result))

    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)