from PIL import Image
from transformers import AutoModelForImageSegmentation
import torch

model = AutoModelForImageSegmentation.from_pretrained(
    "briaai/RMBG-2.0",
    trust_remote_code=True
)

image = Image.open("input.jpg").convert("RGB")

result = model(image)

mask = result[0].squeeze().detach().cpu().numpy()

mask = Image.fromarray((mask * 255).astype("uint8"))
mask = mask.resize(image.size)

output = Image.new("RGBA", image.size)
output.paste(image, (0, 0))
output.putalpha(mask)

output.save("output.png")

print("Done! Saved as output.png")