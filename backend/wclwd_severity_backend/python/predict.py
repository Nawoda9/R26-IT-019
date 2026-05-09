import torch
from torchvision import transforms
from PIL import Image
import timm
import sys
import json

# ================================
# CLASS LABELS
# IMPORTANT:
# Keep SAME order used during training
# ================================
classes = [
    'WCLWD_Drying of Leaflets',
    'WCLWD_Flaccidity',
    'WCLWD_Yellowing'
]

# ================================
# IMAGE PREPROCESSING
# Same preprocessing used in testing
# ================================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ================================
# LOAD ViT MODEL
# ================================
model = timm.create_model(
    'vit_base_patch16_224',
    pretrained=False,
    num_classes=3
)

# ================================
# LOAD TRAINED WEIGHTS
# ================================
model.load_state_dict(
    torch.load(
        'models/vit_wclwd_model.pth',
        map_location=torch.device('cpu')
    )
)

# ================================
# EVALUATION MODE
# ================================
model.eval()

# ================================
# GET IMAGE PATH FROM NODE.JS
# ================================
image_path = sys.argv[1]

# ================================
# OPEN IMAGE
# ================================
image = Image.open(image_path).convert('RGB')

# ================================
# PREPROCESS IMAGE
# ================================
image = transform(image).unsqueeze(0)

# ================================
# PREDICTION
# ================================
with torch.no_grad():

    outputs = model(image)

    probabilities = torch.nn.functional.softmax(outputs[0], dim=0)

    confidence, predicted = torch.max(probabilities, 0)

# ================================
# RESULT
# ================================

prediction = classes[predicted.item()]
confidence_score = round(confidence.item() * 100, 2)

result = {
    "prediction": prediction,
    "confidence": confidence_score
}

print(json.dumps(result))


# ================================
# RETURN JSON RESULT
# ================================
#print(json.dumps(result))