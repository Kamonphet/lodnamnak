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
# จุดอ้างอิงบนหัว: คิ้ว z≈0.84 (phi≈1.27 ด้านหน้า), หู z 0.74-0.84 ที่ theta≈1.41-1.85
def _interp(points, x):
    """เส้นโค้งเรียบผ่านจุด (x, y) เรียงตาม x (cosine interpolation)"""
    if x <= points[0][0]:
        return points[0][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x <= x1:
            t = (x - x0) / (x1 - x0)
            t = (1 - math.cos(math.pi * t)) / 2
            return y0 + (y1 - y0) * t
    return points[-1][1]


def hairline_boy(front=1.02, temple=1.2, sideburn=1.3, over_ear=1.18, nape=2.12):
    """ไรผมผู้ชาย: หน้าผากเหนือคิ้ว จอนหน้าหู โค้งข้ามหู ท้ายทอยโค้งมน (ไม่แหลม)"""
    pts = [
        (0.0, front),
        (0.55, front + 0.05),
        (0.9, temple),
        (1.22, sideburn),
        (1.45, over_ear),
        (1.85, over_ear),
        (2.35, nape - 0.3),
        (2.75, nape),
        (math.pi, nape),
    ]
    return lambda theta: _interp(pts, abs(theta))


def volume_cap(bm, hairline, edge=0.008, volume=0.03, front_lift=0.0, part=None, thickness=0.02):
    """หมวกผมที่มีวอลุ่ม: แนบหัวที่ขอบไรผม แล้วค่อย ๆ หนาขึ้นไปทางกระหม่อม
    front_lift: เสริมความฟูด้านหน้าบน, part: (theta, width) ร่องแสกที่ยุบลง"""
    tmp = bmesh.new()
    ellipsoid(tmp, HEAD_C, HEAD_R, segs=96, rings=56)

    def extra_at(theta, phi):
        depth = max(0.0, min(1.0, (hairline(theta) - phi) / 0.55))
        e = edge + volume * depth ** 0.6
        e += front_lift * max(0.0, math.cos(theta)) ** 2 * math.exp(-((phi - 0.75) / 0.35) ** 2)
        if part is not None:
            pth, pw = part
            # ร่องแสก: จางลงใกล้กระหม่อม (theta ไม่นิ่งที่ขั้ว) และก่อนถึงหน้าผาก
            fade = min(1.0, max(0.0, (phi - 0.25) / 0.2)) * min(1.0, max(0.0, (1.15 - phi) / 0.15))
            e -= volume * 0.75 * math.exp(-(((theta - pth) / pw) ** 2)) * fade
        return max(edge, e)

    kill = []
    for v in tmp.verts:
        d = v.co - HEAD_C
        d = Vector((d.x / HEAD_R.x, d.y / HEAD_R.y, d.z / HEAD_R.z))
        phi = math.acos(max(-1, min(1, d.z)))
        theta = math.atan2(d.x, -d.y)
        if phi > hairline(theta):
            kill.append(v)
            continue
        v.co, _ = head_point(theta, phi, extra_at(theta, phi))
    bmesh.ops.delete(tmp, geom=kill, context="VERTS")
    for v in tmp.verts:
        if v.is_boundary:
            d = v.co - HEAD_C
            theta = math.atan2(d.x / HEAD_R.x, -d.y / HEAD_R.y)
            ph = hairline(theta)
            v.co, _ = head_point(theta, ph, extra_at(theta, ph))
    # เปลือกด้านใน: ดึงเข้าหาศูนย์กลางหัวตรง ๆ แล้วเย็บขอบ (bmesh solidify พุ่งออกที่มุมแหลมของจอน)
    outer = list(tmp.verts)
    faces = list(tmp.faces)
    edges = [e for e in tmp.edges if e.is_boundary]
    inner = {}
    for v in outer:
        r = v.co - HEAD_C
        inner[v] = tmp.verts.new(HEAD_C + r * max(0.5, 1 - thickness / r.length))
    for f in faces:
        tmp.faces.new([inner[v] for v in reversed(f.verts)])
    for e in edges:
        a, b = e.verts
        tmp.faces.new((a, b, inner[b], inner[a]))
    me = bpy.data.meshes.new("tmp_cap")
    tmp.to_mesh(me)
    tmp.free()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    return extra_at


def lock(bm, theta, phi0, phi1, extra0, extra1, r0, r1, drift=0.0, out=0.0, steps=5):
    """ปอยผมเรียวจาก (theta, phi0) ไหลลงตามผิวหัวถึง phi1 ปลายเบนไปข้าง drift (เรเดียน) และยื่นออก out"""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        p, d = head_point(theta + drift * t * t, phi0 + (phi1 - phi0) * t, extra0 + (extra1 - extra0) * t)
        pts.append(p + d * out * t * t)
    tube(bm, pts, r0, r1, sub=3)


def casual(bm):
    """สั้นธรรมชาติ: ฟูด้านบน หน้าม้าปอยหนาปัดเฉียงลงเหนือคิ้ว มีจุกชี้ที่กระหม่อม"""
    hl = hairline_boy(front=1.0)
    extra = volume_cap(bm, hl, volume=0.034, front_lift=0.018)
    # หน้าม้าเป็นปอย ๆ ปัดเฉียงไปทางซ้ายของตัวละคร
    for i, th in enumerate((-0.7, -0.42, -0.14, 0.14, 0.42, 0.7)):
        top = 0.62 + 0.05 * abs(th)
        lock(bm, th, top, 1.12 + 0.05 * abs(th), extra(th, top) - 0.006, 0.012, 0.034, 0.012, drift=0.22, out=0.01)
    # จุกที่กระหม่อมด้านหลัง
    for th, ln in ((math.pi - 0.2, 0.045), (math.pi + 0.2, 0.04)):
        base, d = head_point(th, 0.4, extra(th, 0.4) - 0.012)
        cone(bm, base, base + (d + Vector((0, 0.6, 0.2))).normalized() * ln, 0.03)


def spiky(bm):
    """เซ็ตตั้ง: ข้างสั้นแนบ ด้านบนเป็นปลายแหลมหนา ๆ ชี้ขึ้นและเฉียงไปข้างหน้าเล็กน้อย"""
    hl = hairline_boy(front=1.05, temple=1.15, sideburn=1.4)
    extra = volume_cap(bm, hl, volume=0.018)
    rnd = random.Random(3)
    golden = math.pi * (3 - math.sqrt(5))
    n = 90
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n
        phi = math.acos(z) * 0.72  # เฉพาะด้านบนหัว (phi < ~1.15)
        th = (i * golden) % (2 * math.pi) - math.pi
        if phi > hl(th) - 0.18:
            continue
        base, d = head_point(th, phi, extra(th, phi) - 0.014)
        # ด้านหน้าชี้ขึ้นเฉียงหน้า ด้านหลังชี้ขึ้นเฉียงหลัง
        lean = Vector((0, -0.25 * math.cos(th), 1.0))
        direction = (d * 0.8 + lean).normalized()
        length = (0.1 - 0.035 * phi) * (0.85 + 0.3 * rnd.random())
        cone(bm, base, base + direction * length, 0.036 + 0.01 * rnd.random(), segs=8)


def sidepart(bm):
    """ปัดข้างเรียบร้อย: แสกด้านขวาของตัวละคร ผมด้านบนกวาดเป็นโค้งฟูไปทางซ้าย"""
    part_theta = -0.55
    hl = hairline_boy(front=1.03)
    extra = volume_cap(bm, hl, volume=0.03, front_lift=0.022, part=(part_theta, 0.06))
    # ลอนโค้งหน้าผาก: เริ่มจากแนวแสก กวาดข้ามหน้าผากไปอีกข้าง
    for k in range(5):
        phi0 = 0.45 + 0.1 * k
        th0 = part_theta + 0.08
        pts = []
        for i in range(7):
            t = i / 6
            th = th0 + (1.25 - 0.1 * k) * t
            ph = phi0 + (0.25 + 0.04 * k) * math.sin(math.pi * t * 0.9)
            p, d = head_point(th, ph, extra(th, ph) - 0.004 + 0.012 * math.sin(math.pi * t))
            pts.append(p)
        tube(bm, pts, 0.03, 0.022, sub=3)
    # ด้านแสกที่สั้นกว่า หวีเรียบลงไปทางขวา
    for k in range(3):
        lock(bm, part_theta - 0.1, 0.55 + 0.12 * k, 1.0 + 0.04 * k, extra(part_theta - 0.1, 0.55) - 0.006, 0.01, 0.026, 0.012, drift=-0.35)


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
    """หยิกธรรมชาติ: ลอนเล็กแน่นทั้งหัว ฟูด้านบน ข้างสั้น ลอนหน้าผากตกลงมาเล็กน้อย"""
    hl = hairline_boy(front=0.98, temple=1.18, sideburn=1.38)
    extra = volume_cap(bm, hl, volume=0.022, edge=0.006)
    rnd = random.Random(5)
    golden = math.pi * (3 - math.sqrt(5))
    n = 300
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n
        phi = math.acos(z)
        th = (i * golden) % (2 * math.pi) - math.pi
        if phi > hl(th) - 0.04:
            continue
        top = max(0.0, math.cos(phi))  # ลอนด้านบนใหญ่และยื่นกว่าด้านข้าง
        p, d = head_point(th, phi, extra(th, phi) + 0.008 + 0.016 * top)
        r = (0.023 + 0.01 * top) * (0.85 + 0.3 * rnd.random())
        ellipsoid(bm, p, (r, r, r), segs=10, rings=6)


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
