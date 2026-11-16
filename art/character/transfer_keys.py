"""ขั้นที่ 6: ให้ชิ้นที่ไม่ได้ตัดจากผิวร่างกาย (หน้า ปก ฮู้ด กระดุม กระโปรง) ขยับตามรูปร่าง

แต่ละจุดของชิ้นส่วนจะเลื่อนเท่ากับจุดที่ใกล้ที่สุดบนร่างกายในแต่ละ shape key (Thin / Heavy / Girl)
"""
import bpy
from mathutils import kdtree

KEYS = ("Thin", "Heavy", "Girl")


def body_deltas():
    body = bpy.data.objects["LN_Body"]
    kb = body.data.shape_keys.key_blocks
    base = [v.co.copy() for v in kb["Basis"].data]
    tree = kdtree.KDTree(len(base))
    for i, co in enumerate(base):
        tree.insert(body.matrix_world @ co, i)
    tree.balance()
    deltas = {k: [kb[k].data[i].co - base[i] for i in range(len(base))] for k in KEYS}
    return tree, deltas


def needs_transfer(name):
    if name.startswith("LN_Face_"):
        return True
    if "__" in name and name.startswith(("LN_Top_", "LN_Bottom_")):
        return not name.endswith("__bib")
    return name.startswith("LN_Bottom_skirt")


def transfer_all():
    tree, deltas = body_deltas()
    count = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH" or not needs_transfer(obj.name):
            continue
        if obj.data.shape_keys:
            obj.shape_key_clear()
        obj.shape_key_add(name="Basis", from_mix=False)
        rot_inv = obj.matrix_world.to_3x3().inverted()
        world = [obj.matrix_world @ v.co for v in obj.data.vertices]
        nearest = []
        for co in world:
            # เฉลี่ยจากจุดใกล้สุด 4 จุด เพื่อไม่ให้ชิ้นส่วนบิดเป็นเหลี่ยม
            hits = tree.find_n(co, 4)
            nearest.append([idx for _, idx, _ in hits])
        for key in KEYS:
            kb = obj.shape_key_add(name=key, from_mix=False)
            for i, v in enumerate(obj.data.vertices):
                d = sum((deltas[key][j] for j in nearest[i]), deltas[key][0] * 0) / len(nearest[i])
                kb.data[i].co = v.co + rot_inv @ d
        count += 1
    print("transferred shape keys to", count, "objects")


transfer_all()
