"""ขั้นที่ 1: สร้างร่างกายตัวละคร chibi จากรูปทรงขนาดแน่นอน แล้วหลอมรวมด้วย voxel remesh

รันใน Blender: exec(compile(open(PATH).read(), PATH, 'exec'))
หน่วยเป็นเมตร ตัวละครสูง ~1.0 หันหน้าไปทาง -Y (ด้านหน้าของ Blender) ท่า A-pose
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

COLL = "LN_Character"
ARM_ANGLE = math.radians(40)  # แขนทำมุมลงจากแนวนอน
SHOULDER = Vector((0.118, 0.0, 0.555))
ARM_LEN = 0.27
HIP = Vector((0.062, 0.0, 0.345))
ANKLE_Z = 0.075


def reset_collection(name):
    coll = bpy.data.collections.get(name)
    if coll:
        for obj in list(coll.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
    else:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll


def clean_default_scene():
    obj = bpy.data.objects.get("Cube")
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)


def ellipsoid(bm, center, radii, segs=32, rings=16):
    m = Matrix.Translation(center) @ Matrix.Diagonal((*radii, 1.0))
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0, matrix=m)


def capsule(bm, start, end, r0, r1, segs=20):
    """ทรงกระบอกเรียวปิดหัวท้ายด้วยทรงกลม"""
    start, end = Vector(start), Vector(end)
    axis = end - start
    length = axis.length
    rot = axis.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    mid = (start + end) / 2
    m = Matrix.Translation(mid) @ rot
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r0, radius2=r1, depth=length, matrix=m)
    ellipsoid(bm, start, (r0, r0, r0), segs=segs, rings=10)
    ellipsoid(bm, end, (r1, r1, r1), segs=segs, rings=10)


def arm_end(sx):
    return SHOULDER * Vector((sx, 1, 1)) + Vector((sx * ARM_LEN * math.cos(ARM_ANGLE), 0, -ARM_LEN * math.sin(ARM_ANGLE)))


def build_shapes():
    bm = bmesh.new()
    # หัวกลมโต (กว้าง ~0.36) + แก้ม
    ellipsoid(bm, (0, 0, 0.80), (0.18, 0.168, 0.172), segs=48, rings=24)
    for sx in (-1, 1):
        # แก้มป่องเล็กน้อย (ฝังในหัวเกือบทั้งหมด)
        ellipsoid(bm, (sx * 0.075, -0.085, 0.74), (0.065, 0.06, 0.055))
        # หู
        ellipsoid(bm, (sx * 0.178, 0.005, 0.79), (0.03, 0.045, 0.058))
    # คอ
    capsule(bm, (0, 0, 0.58), (0, 0, 0.66), 0.048, 0.05)
    # ลำตัว: อก ท้อง สะโพก
    # ลำตัวทรงไข่ชิ้นเดียว + สะโพก ให้ผิวต่อเนื่องไม่เป็นปล้อง
    ellipsoid(bm, (0, -0.004, 0.465), (0.116, 0.09, 0.135), segs=40, rings=20)
    ellipsoid(bm, (0, 0.004, 0.375), (0.11, 0.084, 0.07))
    for sx in (-1, 1):
        sh = SHOULDER * Vector((sx, 1, 1))
        # ไหล่มน
        ellipsoid(bm, sh + Vector((-sx * 0.01, 0, 0)), (0.045, 0.045, 0.045))
        end = arm_end(sx)
        capsule(bm, sh, end, 0.036, 0.028)
        # มือ: ฝ่ามือ + นิ้วโป้ง
        d = Vector((sx * math.cos(ARM_ANGLE), 0, -math.sin(ARM_ANGLE)))
        palm = end + d * 0.04
        ellipsoid(bm, palm, (0.038, 0.022, 0.042))
        ellipsoid(bm, palm + Vector((0, -0.022, 0.012)), (0.012, 0.012, 0.02))
        # ขา + เท้า
        hip = HIP * Vector((sx, 1, 1))
        capsule(bm, hip, (hip.x, 0, ANKLE_Z), 0.052, 0.04)
        ellipsoid(bm, (hip.x, -0.028, 0.033), (0.046, 0.07, 0.034))
    return bm


def main():
    clean_default_scene()
    coll = reset_collection(COLL)
    bm = build_shapes()
    mesh = bpy.data.meshes.new("LN_Body")
    bm.to_mesh(mesh)
    bm.free()
    body = bpy.data.objects.new("LN_Body", mesh)
    coll.objects.link(body)

    bpy.context.view_layer.objects.active = body
    for o in bpy.context.selected_objects:
        o.select_set(False)
    body.select_set(True)

    # หลอมรวมทุกชิ้นเป็นผิวเดียว แล้วลบมุมรอยต่อให้มนแบบตัวการ์ตูน
    rm = body.modifiers.new("Remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = 0.0055
    bpy.ops.object.modifier_apply(modifier=rm.name)
    sm = body.modifiers.new("Smooth", "CORRECTIVE_SMOOTH")
    sm.factor = 0.8
    sm.iterations = 30
    sm.smooth_type = "LENGTH_WEIGHTED"
    sm.use_only_smooth = True
    bpy.ops.object.modifier_apply(modifier=sm.name)
    dec = body.modifiers.new("Decimate", "DECIMATE")
    dec.ratio = 0.14
    bpy.ops.object.modifier_apply(modifier=dec.name)
    bpy.ops.object.shade_smooth()

    print("body faces:", len(body.data.polygons), "dims:", tuple(round(d, 3) for d in body.dimensions))


main()
