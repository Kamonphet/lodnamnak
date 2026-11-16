"""ขั้นที่ 2: shape key รูปร่าง (ผอม/อ้วน/หญิง) + โครงกระดูกสำหรับท่าทางในแอป

Shape keys (ค่า 0..1 ผสมกันได้ในแอป):
- Thin   : 1 = ผอมมาก, 0.5 = ผอมเพรียว
- Heavy  : 0.5 = อวบ, 1 = อ้วน
- Girl   : สัดส่วนผู้หญิง (เอวคอดเล็กน้อย สะโพกกว้างขึ้น ไหล่แคบลง)
ค่า 0 ทั้งหมด = สมส่วนมาตรฐาน
"""
import math

import bpy
from mathutils import Vector

exec(compile(open(r"D:\COM\Programing\Lodnamnak\art\character\build_body.py", encoding="utf-8").read(), "build_body", "exec"))  # noqa: E501  สร้างร่างใหม่ทุกครั้ง


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def regions(co):
    """น้ำหนักของแต่ละส่วนร่างกายที่ตำแหน่ง co (ท่า A-pose)"""
    x, y, z = abs(co.x), co.y, co.z
    head = smoothstep(0.64, 0.68, z)
    arm_side = smoothstep(0.12, 0.15, x) * smoothstep(0.30, 0.36, z)
    leg = (1 - smoothstep(0.31, 0.35, z)) * (1 - arm_side)
    torso = (1 - head) * (1 - arm_side) * (1 - leg)
    # ตำแหน่งตามแนวแขน 0 = ไหล่, 1 = ข้อมือ
    sh = SHOULDER
    d = Vector((math.cos(ARM_ANGLE), 0, -math.sin(ARM_ANGLE)))
    arm_t = max(0.0, min(1.2, (Vector((x, 0, z)) - Vector((sh.x, 0, sh.z))).dot(d) / ARM_LEN))
    # ตำแหน่งตามแนวขา 0 = สะโพก, 1 = ข้อเท้า
    leg_t = max(0.0, min(1.2, (HIP.z - z) / (HIP.z - ANKLE_Z)))
    return head, torso, arm_side, arm_t, leg, leg_t, y


def heavy_offset(co, n):
    head, torso, arm, arm_t, leg, leg_t, y = regions(co)
    off = Vector((0, 0, 0))
    # ลำตัว: พองออกรอบตัว + พุงยื่นด้านหน้า ช่วงท้องมากที่สุด
    belly_z = math.exp(-(((co.z - 0.43) / 0.075) ** 2))
    chest_taper = 1 - 0.6 * smoothstep(0.50, 0.60, co.z)
    off += n * torso * (0.035 * chest_taper + 0.03 * belly_z)
    off += Vector((0, -1, 0)) * torso * belly_z * max(0.0, -n.y) * 0.035
    # สะโพกกว้าง ต้นขาใหญ่ เรียวลงที่ข้อเท้า
    off += n * leg * (0.032 * (1 - min(leg_t, 1)) + 0.008)
    # ต้นแขนใหญ่ เรียวลงที่มือ
    off += n * arm * (0.022 * (1 - min(arm_t, 1)) + 0.005)
    # แก้มอิ่มขึ้นเล็กน้อย เฉพาะครึ่งหน้า ไม่รวมหู
    cheek = math.exp(-(((co.z - 0.735) / 0.04) ** 2)) * (1 - smoothstep(0.13, 0.16, abs(co.x))) * smoothstep(0.0, -0.06, co.y)
    off += n * head * 0.01 * cheek
    # คออ้วนขึ้นให้ต่อกับคางเนียน
    neck = smoothstep(0.57, 0.6, co.z) * (1 - smoothstep(0.66, 0.70, co.z)) * (1 - arm)
    off += n * neck * 0.02
    return off


def thin_offset(co, n):
    head, torso, arm, arm_t, leg, leg_t, y = regions(co)
    off = Vector((0, 0, 0))
    waist = math.exp(-(((co.z - 0.43) / 0.08) ** 2))
    off -= n * torso * (0.018 + 0.012 * waist)
    off -= n * leg * (0.014 * (1 - min(leg_t, 1)) + 0.006)
    off -= n * arm * (0.009 * (1 - min(arm_t, 1)) + 0.004)
    return off


def girl_offset(co, n):
    head, torso, arm, arm_t, leg, leg_t, y = regions(co)
    off = Vector((0, 0, 0))
    waist = math.exp(-(((co.z - 0.45) / 0.05) ** 2))
    hip = math.exp(-(((co.z - 0.36) / 0.05) ** 2))
    shoulder = math.exp(-(((co.z - 0.55) / 0.04) ** 2))
    side = Vector((math.copysign(1, co.x) if abs(co.x) > 1e-4 else 0, 0, 0))
    off -= side * torso * waist * 0.008 * smoothstep(0.03, 0.09, abs(co.x))
    off += side * (torso + leg * 0.5) * hip * 0.01 * smoothstep(0.03, 0.09, abs(co.x))
    off -= side * torso * shoulder * 0.008 * smoothstep(0.06, 0.11, abs(co.x))
    return off


def smooth_field(me, offsets, iterations=20):
    """เฉลี่ยค่าการเลื่อนจุดกับจุดข้างเคียง เพื่อไม่ให้เกิดรอยพับตรงรอยต่อของส่วนต่าง ๆ"""
    nbrs = [[] for _ in me.vertices]
    for e in me.edges:
        a, b = e.vertices
        nbrs[a].append(b)
        nbrs[b].append(a)
    for _ in range(iterations):
        new = []
        for i, off in enumerate(offsets):
            if not nbrs[i]:
                new.append(off)
                continue
            avg = sum((offsets[j] for j in nbrs[i]), Vector((0, 0, 0))) / len(nbrs[i])
            new.append(off * 0.4 + avg * 0.6)
        offsets = new
    return offsets


def add_shape_keys(body):
    me = body.data
    body.shape_key_add(name="Basis", from_mix=False)
    normals = [v.normal.copy() for v in me.vertices]
    base = [v.co.copy() for v in me.vertices]
    for name, fn in (("Thin", thin_offset), ("Heavy", heavy_offset), ("Girl", girl_offset)):
        offsets = smooth_field(me, [fn(co, n) for co, n in zip(base, normals)])
        key = body.shape_key_add(name=name, from_mix=False)
        for i, co in enumerate(base):
            key.data[i].co = co + offsets[i]


# ---------- โครงกระดูก ----------
BONES = [
    # name, head, tail, parent
    ("hips", (0, 0, 0.36), (0, 0, 0.44), None),
    ("spine", (0, 0, 0.44), (0, 0, 0.53), "hips"),
    ("chest", (0, 0, 0.53), (0, 0, 0.6), "spine"),
    ("neck", (0, 0, 0.6), (0, 0, 0.665), "chest"),
    ("head", (0, 0, 0.665), (0, 0, 0.96), "neck"),
]


def arm_point(sx, t):
    d = Vector((sx * math.cos(ARM_ANGLE), 0, -math.sin(ARM_ANGLE)))
    sh = SHOULDER * Vector((sx, 1, 1))
    return tuple(sh + d * ARM_LEN * t)


for side, sx in (("L", 1), ("R", -1)):
    BONES += [
        (f"upper_arm.{side}", arm_point(sx, -0.08), arm_point(sx, 0.48), "chest"),
        (f"forearm.{side}", arm_point(sx, 0.48), arm_point(sx, 1.0), f"upper_arm.{side}"),
        (f"hand.{side}", arm_point(sx, 1.0), arm_point(sx, 1.35), f"forearm.{side}"),
        (f"thigh.{side}", (sx * 0.062, 0, 0.345), (sx * 0.062, 0, 0.21), "hips"),
        (f"shin.{side}", (sx * 0.062, 0, 0.21), (sx * 0.062, 0, 0.07), f"thigh.{side}"),
        (f"foot.{side}", (sx * 0.062, 0, 0.07), (sx * 0.062, -0.085, 0.03), f"shin.{side}"),
    ]


def build_armature(coll):
    arm = bpy.data.armatures.new("LN_Rig")
    rig = bpy.data.objects.new("LN_Rig", arm)
    coll.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    for o in bpy.context.selected_objects:
        o.select_set(False)
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.edit_bones
    for name, head, tail, parent in BONES:
        b = eb.new(name)
        b.head, b.tail = head, tail
        if parent:
            b.parent = eb[parent]
            b.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def skin(body, rig):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")


def main_rig():
    coll = bpy.data.collections["LN_Character"]
    body = bpy.data.objects["LN_Body"]
    add_shape_keys(body)
    rig = build_armature(coll)
    skin(body, rig)
    print("shape keys:", [k.name for k in body.data.shape_keys.key_blocks], "groups:", len(body.vertex_groups))


main_rig()
