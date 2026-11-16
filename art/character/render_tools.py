"""ตัวช่วยเรนเดอร์ภาพตัวอย่างเป็นตาราง (ใช้ตรวจงานระหว่างสร้าง)"""
import os
import tempfile

import bpy
import numpy as np

EXPRESSIONS = ("happy", "angry", "sad", "shocked", "playful", "curious")
OUT = os.path.join(tempfile.gettempdir(), "lodnamnak_renders")


def show_expression(expr):
    for o in bpy.data.objects:
        if not o.name.startswith("LN_Face_"):
            continue
        parts = o.name.split("_")
        tag = parts[-1] if parts[-1] in EXPRESSIONS else None
        hide = tag is not None and tag != expr
        if expr == "playful" and o.name.endswith(".R") and any(k in o.name for k in ("Eye", "Iris", "Pupil", "Highlight")):
            hide = True
        o.hide_set(hide)
        o.hide_render = hide


def set_camera(center_z, width, center_x=0.0, res=400, aspect=1.0):
    s = bpy.context.scene
    cam = bpy.data.objects["LN_PreviewCam"]
    cam.data.ortho_scale = width
    cam.location = (center_x, -5, center_z)
    s.render.resolution_x = res
    s.render.resolution_y = int(res / aspect)
    s.eevee.taa_render_samples = 16


def render_grid(name, setters, cols=3):
    """setters: list of callables; แต่ละอันจัดฉากก่อนเรนเดอร์ 1 ช่อง"""
    os.makedirs(OUT, exist_ok=True)
    s = bpy.context.scene
    w, h = s.render.resolution_x, s.render.resolution_y
    tiles = []
    for i, fn in enumerate(setters):
        fn()
        path = os.path.join(OUT, f"{name}_{i}.png")
        s.render.filepath = path
        bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(path)
        tiles.append(np.array(img.pixels[:]).reshape(h, w, 4))
        bpy.data.images.remove(img)
    blank = np.ones((h, w, 4))
    while len(tiles) % cols:
        tiles.append(blank)
    rows = [np.concatenate(tiles[r : r + cols], axis=1) for r in range(0, len(tiles), cols)]
    grid = np.concatenate(list(reversed(rows)), axis=0)
    im = bpy.data.images.new(name, grid.shape[1], grid.shape[0], alpha=True)
    im.pixels = grid.ravel()
    path = os.path.join(OUT, f"{name}.png")
    im.filepath_raw = path
    im.file_format = "PNG"
    im.save()
    bpy.data.images.remove(im)
    return path
