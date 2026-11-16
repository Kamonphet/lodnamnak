"""วัสดุพื้นฐานของตัวละคร (สีจริงจะเปลี่ยนในแอปผ่าน three.js อีกที)"""
import bpy

SKIN_TONES = {
    "fair": (0.96, 0.80, 0.72),
    "peach": (0.94, 0.70, 0.58),
    "honey": (0.86, 0.58, 0.40),
    "olive": (0.74, 0.50, 0.34),
    "bronze": (0.62, 0.38, 0.25),
    "ebony": (0.30, 0.17, 0.12),
}


def srgb_to_linear(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def material(name, color, roughness=0.55, sss=0.0, emission=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    lin = (*srgb_to_linear(color), 1.0)
    bsdf.inputs["Base Color"].default_value = lin
    bsdf.inputs["Roughness"].default_value = roughness
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = sss
    if emission is not None and "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = lin
        bsdf.inputs["Emission Strength"].default_value = emission
    mat.diffuse_color = lin
    return mat


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def skin_material():
    return material("LN_Skin", SKIN_TONES["peach"], roughness=0.5, sss=0.08)
