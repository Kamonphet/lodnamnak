"""ฉากสำหรับเรนเดอร์ภาพตัวอย่าง: พื้นหลังขาว ไฟนุ่ม กล้องมุมตรงแบบ orthographic"""
import math

import bpy


def ensure_stage(width=4.6, center_x=0.0, height=1.15):
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = False
    scene.render.resolution_x = 1600
    scene.render.resolution_y = int(1600 * height / width)
    scene.view_settings.view_transform = "Standard"

    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.97, 0.97, 0.97, 1)
    bg.inputs[1].default_value = 0.55

    cam = bpy.data.objects.get("LN_PreviewCam")
    if not cam:
        cam = bpy.data.objects.new("LN_PreviewCam", bpy.data.cameras.new("LN_PreviewCam"))
        scene.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = width
    cam.location = (center_x, -5, 0.5)
    cam.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam

    for name, loc, energy, size in (
        ("LN_KeyLight", (-2.5, -4, 3.5), 160, 4),
        ("LN_FillLight", (3, -3, 1.5), 70, 5),
        ("LN_RimLight", (0, 4, 3), 90, 3),
    ):
        lamp = bpy.data.objects.get(name)
        if not lamp:
            lamp = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA"))
            scene.collection.objects.link(lamp)
        lamp.location = loc
        lamp.data.energy = energy
        lamp.data.size = size
        direction = -lamp.location.normalized()
        lamp.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    old = bpy.data.objects.get("Light")
    if old:
        old.hide_render = True
        old.hide_set(True)
