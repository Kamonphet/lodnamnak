"""ขั้นที่ 4: ทรงผม 8 แบบ (ชาย 4, หญิง 4) ใช้วัสดุ LN_Hair เดียวกับคิ้ว เพื่อให้แอปเปลี่ยนสีพร้อมกัน

ชื่อวัตถุ: LN_Hair_<style>
ชาย: casual, spiky, sidepart, curly_short
หญิง: long, bob, ponytail, curly_long
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

BASE = r"D:\COM\Programing\Lodnamnak\art\character\\"
exec(compile(open(BASE + "materials.py", encoding="utf-8").read(), "materials", "exec"))

HEAD_C = Vector((0, 0, 0.80))
HEAD_R = Vector((0.18, 0.168, 0.172))
COLL = "LN_Character"


def head_point(theta, phi, extra=0.0):
    """จุดบนผิวหัว: theta = มุมรอบแกน Z (0 = ด้านหน้า -Y), phi = มุมจากแกนตั้ง (0 = กลางกระหม่อม)"""
    d = Vector((math.sin(phi) * math.sin(theta), -math.sin(phi) * math.cos(theta), math.cos(phi)))
    r = Vector((HEAD_R.x + extra, HEAD_R.y + extra, HEAD_R.z + extra))
    return HEAD_C + Vector((d.x * r.x, d.y * r.y, d.z * r.z)), d


def ellipsoid(bm, center, radii, rot=None, segs=20, rings=10):
    m = Matrix.Translation(center)
    if rot is not None:
        m = m @ rot.to_4x4()
    m = m @ Matrix.Diagonal((*radii, 1.0))
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0, matrix=m)


def cone(bm, base, tip, r, segs=10):
    base, tip = Vector(base), Vector(tip)
    axis = tip - base
    rot = axis.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    m = Matrix.Translation((base + tip) / 2) @ rot
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=0.002, depth=axis.length, matrix=m)


def tube(bm, points, r0, r1, segs=12, sub=4):
    """ท่อเรียบ: วางทรงกลมถี่ ๆ ตามเส้นทาง (แทรกจุดระหว่างกลาง sub จุด) เพื่อไม่ให้เป็นปล้อง"""
    pts = []
    for a, b in zip(points, points[1:]):
        for k in range(sub):
            pts.append(a.lerp(b, k / sub))
    pts.append(points[-1])
    for i, p in enumerate(pts):
        t = i / max(1, len(pts) - 1)
        r = r0 + (r1 - r0) * t
        ellipsoid(bm, p, (r, r, r), segs=segs, rings=8)


def cap(bm, hairline, thickness=0.014, extra=0.014):
    """หมวกผมคลุมหัว ตัดตามแนวไรผม hairline(theta) -> phi สูงสุดที่ผมคลุมถึง"""
    tmp = bmesh.new()
    r = HEAD_R + Vector((extra, extra, extra))
    ellipsoid(tmp, HEAD_C, r, segs=72, rings=40)
    kill = []
    for v in tmp.verts:
        d = v.co - HEAD_C
        d = Vector((d.x / r.x, d.y / r.y, d.z / r.z))
        phi = math.acos(max(-1, min(1, d.z)))
        theta = math.atan2(d.x, -d.y)
        if phi > hairline(theta):
            kill.append(v)
    bmesh.ops.delete(tmp, geom=kill, context="VERTS")
    # ดึงจุดขอบให้อยู่บนแนวไรผมพอดี เพื่อไม่ให้ขอบเป็นขั้นบันได
    for v in tmp.verts:
        if v.is_boundary:
            d = v.co - HEAD_C
            theta = math.atan2(d.x / r.x, -d.y / r.y)
            p, _ = head_point(theta, hairline(theta), extra)
            v.co = p
    # ทำให้เป็นเปลือกหนา (ปิด) เพื่อหลอมรวมด้วย voxel ได้ โดยหนาเข้าด้านในหัว ผิวนอกอยู่ที่ +extra
    bmesh.ops.reverse_faces(tmp, faces=tmp.faces[:])
    bmesh.ops.solidify(tmp, geom=tmp.faces[:], thickness=thickness)
    me = bpy.data.meshes.new("tmp_cap")
    tmp.to_mesh(me)
    tmp.free()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)


def hairline_short(front=0.62, side=1.4, back=2.3):
    """แนวไรผมทรงสั้น: หน้าผากสูง ด้านข้างเหนือหู ด้านหลังลงถึงท้ายทอย"""

    def fn(theta):
        a = abs(theta) / math.pi  # 0 = หน้า, 1 = หลัง
        if a < 0.35:
            return front + (side - front) * (a / 0.35) ** 1.3
        return side + (back - side) * ((a - 0.35) / 0.65)

    return fn


# ---------- ทรงผมชาย ----------
def casual(bm):
    cap(bm, hairline_short())
    # ปอยหน้าม้าสั้นปัดไปข้าง
    for i in range(7):
        th = -0.75 + i * 0.25
        p, d = head_point(th, 0.62, 0.01)
        ellipsoid(bm, p + Vector((0.012, 0, -0.01)), (0.032, 0.024, 0.03))
    for i in range(10):
        th = i * 2 * math.pi / 10
        p, d = head_point(th, 0.35, 0.014)
        ellipsoid(bm, p, (0.05, 0.05, 0.035))


def spiky(bm):
    cap(bm, hairline_short(front=0.6))
    rnd = random.Random(3)
    for ring, (phi, count, length) in enumerate(((0.15, 5, 0.06), (0.45, 9, 0.058), (0.75, 11, 0.045), (1.05, 12, 0.035))):
        for i in range(count):
            th = i * 2 * math.pi / count + ring * 0.3
            if phi > 0.6 and math.cos(th) > 0.6:
                # หน้าม้า: แหลมชี้ขึ้นไปทางหน้า
                base, d = head_point(th, phi - 0.08, 0.004)
                tip = base + Vector((0, -0.03, 0.05)) + d * 0.02
            else:
                base, d = head_point(th, phi, 0.004)
                tip = base + (d + Vector((0, 0.25, 0.6))).normalized() * length * (0.85 + 0.3 * rnd.random())
            cone(bm, base, tip, 0.036)


def sidepart(bm):
    cap(bm, hairline_short(front=0.66))
    # ผมด้านบนปัดจากรอยแสกขวาไปซ้าย เป็นลอนนูน
    for i in range(9):
        t = i / 8
        th = -0.6 + 1.3 * t
        p, d = head_point(th, 0.55 - 0.15 * math.sin(math.pi * t), 0.012)
        ellipsoid(bm, p + Vector((0, 0, 0.012)), (0.05, 0.045, 0.03))
    p, d = head_point(0.35, 0.62, 0.02)
    ellipsoid(bm, p + Vector((0.0, 0.0, 0.01)), (0.075, 0.05, 0.035), rot=Matrix.Rotation(0.3, 3, "Y"))


def curls(bm, hairline, size=0.03, extra=0.016, seed=5, density=1.0):
    rnd = random.Random(seed)
    n = int(140 * density)
    golden = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n
        phi = math.acos(z)
        theta = (i * golden) % (2 * math.pi) - math.pi
        if phi > hairline(theta):
            continue
        p, d = head_point(theta, phi, extra)
        r = size * (0.85 + 0.35 * rnd.random())
        ellipsoid(bm, p, (r, r, r), segs=12, rings=8)


def curly_short(bm):
    hl = hairline_short(front=0.62)
    cap(bm, hl)
    curls(bm, hl, size=0.034, extra=0.02, density=1.2)


# ---------- ทรงผมหญิง ----------
def hairline_long(front=0.62):
    def fn(theta):
        a = abs(theta) / math.pi
        if a < 0.35:
            return front + (1.55 - front) * (a / 0.35) ** 1.3
        return 1.55 + (2.35 - 1.55) * ((a - 0.35) / 0.65)

    return fn


def back_panel(bm, bottom_z, width=0.16, depth=0.07, top_z=0.8):
    """ผมยาวด้านหลังศีรษะ ไหลลงถึงระดับ bottom_z"""
    steps = 8
    for i in range(steps + 1):
        t = i / steps
        z = top_z + (bottom_z - top_z) * t
        w = width * (1 - 0.15 * t)
        y = 0.08 + 0.02 * t
        ellipsoid(bm, (0, y, z), (w, depth * (1 - 0.3 * t), 0.06))


def long(bm):
    hl = hairline_long(front=0.6)
    cap(bm, hl, extra=0.016)
    back_panel(bm, 0.5, width=0.17)
    # ปอยผมด้านข้างทัดหลังหู
    for sx in (-1, 1):
        tube(bm, [Vector((sx * 0.15, 0.06, 0.84 - 0.05 * i)) + Vector((sx * 0.01 * i, 0.012 * i, 0)) for i in range(6)], 0.04, 0.03)
    # หน้าผากแสกกลาง
    for sx in (-1, 1):
        for i in range(4):
            p, d = head_point(sx * (0.25 + 0.22 * i), 0.62 + 0.08 * i, 0.012)
            ellipsoid(bm, p, (0.04, 0.035, 0.035))


def bob(bm):
    hl = hairline_long(front=0.55)
    cap(bm, hl, extra=0.018)
    # หน้าม้าตรง
    for i in range(9):
        th = -0.8 + i * 0.2
        p, d = head_point(th, 0.72, 0.016)
        ellipsoid(bm, p + Vector((0, -0.004, -0.008)), (0.03, 0.02, 0.05))
    # ทรงบ๊อบ: ผมตกตรงลงถึงระดับคาง รอบด้านข้างและหลัง (ไม่ทับหน้า)
    for i in range(26):
        th = math.radians(62 + i * (236 / 25))
        top, d = head_point(th, 1.2, 0.02)
        side, d2 = head_point(th, 1.57, 0.028)
        bottom = Vector((side.x * 1.04, side.y * 1.04, 0.705))
        tube(bm, [top, side, bottom], 0.03, 0.034, sub=3)


def ponytail(bm):
    hl = hairline_long(front=0.6)
    cap(bm, lambda th: min(hl(th), 1.75), extra=0.013)
    # ยางรัด + หางม้ายกสูง
    tie, d = head_point(math.pi, 0.62, 0.02)
    ellipsoid(bm, tie, (0.042, 0.042, 0.042))
    pts = []
    for i in range(9):
        t = i / 8
        pts.append(tie + Vector((0, 0.05 + 0.08 * math.sin(t * 1.6), 0.05 * math.sin(t * 3.0) - 0.3 * t)))
    tube(bm, pts, 0.065, 0.03)
    # ปอยหน้าแสกข้าง
    for i in range(5):
        p, d = head_point(-0.6 + 0.3 * i, 0.6 + 0.04 * i, 0.012)
        ellipsoid(bm, p, (0.04, 0.035, 0.035))


def curly_long(bm):
    hl = hairline_long(front=0.6)
    cap(bm, hl, extra=0.018)
    curls(bm, hl, size=0.04, extra=0.026, density=1.3, seed=8)
    rnd = random.Random(11)
    # ลอนยาวด้านหลังและข้างลงถึงไหล่
    for i in range(70):
        th = math.radians(rnd.uniform(78, 282))
        z = rnd.uniform(0.58, 0.8)
        p, d = head_point(th, 1.57, 0.035 + 0.02 * (0.8 - z) / 0.24)
        r = rnd.uniform(0.034, 0.048)
        ellipsoid(bm, Vector((p.x * 1.05, p.y + 0.01, z)), (r, r, r), segs=12, rings=8)


STYLES = {
    "casual": casual,
    "spiky": spiky,
    "sidepart": sidepart,
    "curly_short": curly_short,
    "long": long,
    "bob": bob,
    "ponytail": ponytail,
    "curly_long": curly_long,
}


def finish(obj, voxel=0.0045, smooth=6, ratio=None):
    bpy.context.view_layer.objects.active = obj
    for o in bpy.context.selected_objects:
        o.select_set(False)
    obj.select_set(True)
    rm = obj.modifiers.new("Remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier=rm.name)
    sm = obj.modifiers.new("Smooth", "CORRECTIVE_SMOOTH")
    sm.factor = 0.7
    sm.iterations = smooth
    sm.use_only_smooth = True
    bpy.ops.object.modifier_apply(modifier=sm.name)
    dec = obj.modifiers.new("Decimate", "DECIMATE")
    # ให้แต่ละทรงเหลือราว 3,000-4,000 หน้า สำหรับมือถือ
    dec.ratio = ratio or min(1.0, 3500 / max(1, len(obj.data.polygons)))
    bpy.ops.object.modifier_apply(modifier=dec.name)
    bpy.ops.object.shade_smooth()


def build_hair(only=None):
    mat = bpy.data.materials.get("LN_Hair") or material("LN_Hair", (0.36, 0.22, 0.12), roughness=0.6)
    rig = bpy.data.objects["LN_Rig"]
    for name, fn in STYLES.items():
        if only and name not in only:
            continue
        old = bpy.data.objects.get("LN_Hair_" + name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
        bm = bmesh.new()
        fn(bm)
        me = bpy.data.meshes.new("LN_Hair_" + name)
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new("LN_Hair_" + name, me)
        bpy.data.collections[COLL].objects.link(obj)
        finish(obj)
        assign(obj, mat)
        mw = obj.matrix_world.copy()
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = "head"
        obj.matrix_world = mw
        print(name, len(obj.data.polygons))


def show_hair(style):
    for o in bpy.data.objects:
        if o.name.startswith("LN_Hair_"):
            hide = o.name != "LN_Hair_" + style
            o.hide_set(hide)
            o.hide_render = hide


build_hair()
