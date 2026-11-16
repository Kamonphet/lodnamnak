"""ขั้นสุดท้าย: ล้าง mesh ที่ผิดรูป รีเซ็ตท่า/shape key แล้ว export เป็น GLB บีบอัดด้วย meshopt สำหรับแอป"""
import os

import bpy

OUT = r"D:\COM\Programing\Lodnamnak\public\models\character.glb"
BLEND = r"D:\COM\Programing\Lodnamnak\art\character\character.blend"


def export():
    for o in [o for o in bpy.data.objects if o.name.startswith("LN_Preview_")]:
        bpy.data.objects.remove(o, do_unlink=True)
    coll = bpy.data.collections["LN_Character"]
    for o in coll.objects:
        o.hide_set(False)
        o.hide_render = False
        if o.type == "MESH":
            o.data.validate(clean_customdata=False)
            if o.data.shape_keys:
                for k in o.data.shape_keys.key_blocks:
                    k.value = 0
    rig = bpy.data.objects["LN_Rig"]
    for b in rig.pose.bones:
        b.rotation_mode = "XYZ"
        b.rotation_euler = (0, 0, 0)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, copy=True)

    bpy.ops.object.select_all(action="DESELECT")
    for o in coll.objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_skins=True,
        export_morph=True,
        export_morph_normal=True,
        export_animations=False,
        export_yup=True,
        export_texcoords=False,
        export_materials="EXPORT",
        export_meshopt_compression_enable=True,
    )
    print("glb bytes:", os.path.getsize(OUT))


export()
