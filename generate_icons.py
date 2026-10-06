from PIL import Image, ImageDraw

def create_shield_icon(size):
    # Create image with transparent background
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    pad = size * 0.08
    w = size - 2 * pad
    h = size - 2 * pad
    
    # Shield points: top-left, top-right, bottom-middle
    cx = size / 2
    points = [
        (pad + w * 0.15, pad),
        (size - pad - w * 0.15, pad),
        (size - pad, pad + h * 0.45),
        (cx, size - pad),
        (pad, pad + h * 0.45)
    ]
    
    # Background shield - gradient-like deep royal indigo / violet
    shield_color = (79, 70, 229, 255) # Indigo 600
    shield_border = (129, 140, 248, 255) # Indigo 400
    
    draw.polygon(points, fill=shield_color, outline=shield_border, width=max(1, int(size * 0.05)))
    
    # Draw checkmark or slash or 'X' in white
    # Let's draw a sleek white shield crest / checkmark or cross inside
    # A crisp white slash or check
    lw = max(2, int(size * 0.1))
    # Draw stylized 'A' or Checkmark
    # Checkmark coords
    p1 = (cx - w * 0.22, pad + h * 0.45)
    p2 = (cx - w * 0.05, pad + h * 0.65)
    p3 = (cx + w * 0.26, pad + h * 0.32)
    draw.line([p1, p2, p3], fill=(255, 255, 255, 255), width=lw, joint="curve")
    
    return img

for sz in [16, 32, 48, 128]:
    icon = create_shield_icon(sz)
    icon.save(f"icons/icon{sz}.png")

print("Icons generated successfully!")
