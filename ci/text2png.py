import PIL
import os.path
from PIL import ImageFont
from PIL import Image
from PIL import ImageDraw
import sys

color = "#000"
bgcolor = "#FFF"
fontsize = 13
leftpadding = 3
width = 220

base_path = os.path.dirname(__file__)

font = ImageFont.truetype(os.path.join(base_path, "Hack-Regular.otf"), 13)

lines = sys.stdin.readlines()
text = "".join(lines)

line_height = font.getsize(text)[1]
img_height = line_height * len(lines) + 3

img = Image.new("RGBA", (width, img_height), bgcolor)
draw = ImageDraw.Draw(img)

y = 0
for line in lines:
    draw.text( (leftpadding, y), line, color, font=font)
    y += line_height

img.save("translation-status.png")

