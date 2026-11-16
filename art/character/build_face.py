"""ขั้นที่ 3: หน้า (ตา คิ้ว จมูก ปาก แก้มแดง น้ำตา) และสีหน้า 6 แบบ

ทุกชิ้นวางบนผิวหัวจริงด้วยการยิง ray จากด้านหน้า แล้วผูกกับกระดูก head
ชื่อวัตถุ: LN_Face_<ส่วน>[_<สีหน้า>]
- ส่วนที่ใช้ทุกสีหน้า: LN_Face_Nose, LN_Face_Eye.L/R (ลูกตา), LN_Face_Blush
- ส่วนที่สลับตามสีหน้า: LN_Face_Brows_<expr>, LN_Face_Mouth_<expr>, LN_Face_Lids_<expr>, LN_Face_Tears_sad
สีหน้า: happy (ดีใจ), angry (โกรธ), sad (เศร้า), shocked (ตกใจ), playful (ขี้เล่น), curious (สงสัย)
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

BASE = r"D:\COM\Programing\Lodnamnak\art\character\\"
exec(compile(open(BASE + "materials.py", encoding="utf-8").read(), "materials", "exec"))

EXPRESSIONS = ("happy", "angry", "sad", "shocked", "playful", "curious")
COLL = "LN_Character"


def body_bvh():
    body = bpy.data.objects["LN_Body"]
    bm = bmesh.new()
    bm.from_mesh(body.data)  # รูปร่าง basis
    bvh = BVHTree.FromBMesh(bm)
    bm.free()
    return bvh


BVH = None


def surface(x, z, inset=0.0):
    """จุดบนผิวหน้าที่ (x, z) เมื่อมองจากด้านหน้า และ normal ของผิว"""
    loc, normal, _, _ = BVH.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return loc - normal * inset, normal


def link(obj):
    bpy.data.collections[COLL].objects.link(obj)
    return obj


def mesh_obj(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    obj = link(bpy.data.objects.new(name, me))
    assign(obj, mat)
    return obj


def ellipsoid_bm(bm, center, radii, rot=None, segs=24, rings=12):
    m = Matrix.Translation(center)
    if rot is not None:
        m = m @ rot.to_4x4()
    m = m @ Matrix.Diagonal((*radii, 1.0))
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0, matrix=m)


def tube_bm(bm, points, radius, segs=10, taper=True):
    """ท่อเรียวตามเส้นทาง (ใช้ทำคิ้ว ปาก เปลือกตาปิด)"""
    rings = []
    n = len(points)
    for i, p in enumerate(points):
        p = Vector(p)
        t = points[min(i + 1, n - 1)] - points[max(i - 1, 0)]
        t = Vector(t).normalized()
        side = t.cross(Vector((0, -1, 0))).normalized()
        up = side.cross(t).normalized()
        k = math.sin(math.pi * i / (n - 1)) if taper else 1.0
        r = radius * (0.35 + 0.65 * k)
        ring = []
        for j in range(segs):
            a = 2 * math.pi * j / segs
            ring.append(bm.verts.new(p + (side * math.cos(a) + up * math.sin(a) * 0.75) * r))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for j in range(segs):
            bm.faces.new((a[j], a[(j + 1) % segs], b[(j + 1) % segs], b[j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])


def curve_points(x0, x1, z_fn, steps=12, lift=0.004):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = x0 + (x1 - x0) * t
        z = z_fn(t)
        p, n = surface(x, z)
        pts.append(p + n * lift)
    return pts


# ---------- ชิ้นส่วนคงที่ ----------
EYE_X, EYE_Z = 0.066, 0.772
EYE_R = (0.044, 0.03, 0.05)


def build_eyes(mats):
    out = []
    for side, sx in (("L", 1), ("R", -1)):
        p, n = surface(sx * EYE_X, EYE_Z)
        center = p + Vector((0, 0.012, 0))  # ฝังลงในหัวเล็กน้อย
        bm = bmesh.new()
        ellipsoid_bm(bm, center, EYE_R)
        white = mesh_obj(f"LN_Face_EyeWhite.{side}", bm, mats["eye_white"])
        # ม่านตา + รูม่านตา + จุดสะท้อนแสง (มองเฉียงออกด้านข้างเล็กน้อยแบบในภาพอ้างอิง)
        look = Vector((sx * 0.004, 0, -0.002))
        bm = bmesh.new()
        ellipsoid_bm(bm, center + Vector((0, -0.016, 0)) + look, (0.03, 0.017, 0.034))
        iris = mesh_obj(f"LN_Face_Iris.{side}", bm, mats["iris"])
        bm = bmesh.new()
        ellipsoid_bm(bm, center + Vector((0, -0.023, 0)) + look, (0.016, 0.012, 0.019))
        pupil = mesh_obj(f"LN_Face_Pupil.{side}", bm, mats["pupil"])
        bm = bmesh.new()
        ellipsoid_bm(bm, center + Vector((sx * -0.009, -0.031, 0.011)) + look, (0.007, 0.004, 0.008), segs=12, rings=6)
        hl = mesh_obj(f"LN_Face_Highlight.{side}", bm, mats["highlight"])
        out += [white, iris, pupil, hl]
    return out


def build_nose(mats):
    p, n = surface(0, 0.748)
    bm = bmesh.new()
    ellipsoid_bm(bm, p + Vector((0, 0.004, 0)), (0.016, 0.012, 0.012))
    return [mesh_obj("LN_Face_Nose", bm, mats["skin"])]


def build_blush(mats, name="LN_Face_Blush", strength_mat="blush"):
    bm = bmesh.new()
    for sx in (1, -1):
        p, n = surface(sx * 0.108, 0.735)
        rot = n.to_track_quat("Y", "Z").to_matrix()
        ellipsoid_bm(bm, p - n * 0.0005, (0.026, 0.002, 0.016), rot=rot, segs=20, rings=8)
    return [mesh_obj(name, bm, mats[strength_mat])]


# ---------- คิ้ว ----------
BROW_Z = 0.838


def brow(bm, sx, inner_dz, outer_dz, arch=0.008, raise_all=0.0):
    x_in, x_out = sx * 0.035, sx * 0.1

    def z_fn(t):
        base = BROW_Z + raise_all + inner_dz + (outer_dz - inner_dz) * t
        return base + arch * math.sin(math.pi * t)

    tube_bm(bm, curve_points(x_in, x_out, z_fn, lift=0.003), 0.0065)


BROWS = {
    # (inner_dz, outer_dz, arch, raise) ต่อข้าง L, R
    "happy": [(0, -0.004, 0.008, 0.0)] * 2,
    "angry": [(-0.016, 0.006, 0.0, 0.0)] * 2,
    "sad": [(0.012, -0.012, 0.004, 0.0)] * 2,
    "shocked": [(0, -0.002, 0.012, 0.016)] * 2,
    "playful": [(0, -0.004, 0.01, 0.006), (-0.004, -0.008, 0.004, -0.004)],
    "curious": [(0.0, -0.004, 0.012, 0.014), (-0.008, 0.0, 0.0, -0.004)],
}


def build_brows(mats):
    out = []
    for expr, sides in BROWS.items():
        bm = bmesh.new()
        for (inner, outer, arch, raise_all), sx in zip(sides, (1, -1)):
            brow(bm, sx, inner, outer, arch, raise_all)
        out.append(mesh_obj(f"LN_Face_Brows_{expr}", bm, mats["brow"]))
    return out


# ---------- ปาก ----------
MOUTH_Z = 0.712


def mouth_curve(bm, half_w, depth, z0=MOUTH_Z, radius=0.0045, tilt=0.0):
    tube_bm(bm, curve_points(-half_w, half_w, lambda t: z0 - depth * math.sin(math.pi * t) + tilt * (t - 0.5)), radius)


def open_mouth(bm, mats_list, w, h, z0=MOUTH_Z, d_shape=False):
    p, n = surface(0, z0)
    rot = n.to_track_quat("Y", "Z").to_matrix()
    ellipsoid_bm(bm, p + n * 0.001, (w, 0.008, h), rot=rot, segs=28, rings=12)
    if d_shape:
        # ตัดครึ่งบนออกให้เป็นรูปตัว D (ยิ้มกว้าง)
        verts = [v for v in bm.verts if (v.co - p).dot(Vector((0, 0, 1))) > h * 0.25]
        bmesh.ops.delete(bm, geom=verts, context="VERTS")


def build_mouths(mats):
    out = []
    # ดีใจ: ยิ้มโค้ง
    bm = bmesh.new()
    mouth_curve(bm, 0.03, 0.012)
    out.append(mesh_obj("LN_Face_Mouth_happy", bm, mats["mouth_line"]))
    # โกรธ: ปากคว่ำสั้น
    bm = bmesh.new()
    mouth_curve(bm, 0.02, -0.007, z0=MOUTH_Z - 0.004)
    out.append(mesh_obj("LN_Face_Mouth_angry", bm, mats["mouth_line"]))
    # เศร้า: ปากคว่ำกว้าง
    bm = bmesh.new()
    mouth_curve(bm, 0.026, -0.01, z0=MOUTH_Z - 0.006)
    out.append(mesh_obj("LN_Face_Mouth_sad", bm, mats["mouth_line"]))
    # ตกใจ: ปากเปิดรูปไข่
    bm = bmesh.new()
    open_mouth(bm, mats, 0.017, 0.02, z0=MOUTH_Z - 0.008)
    out.append(mesh_obj("LN_Face_Mouth_shocked", bm, mats["mouth_inside"]))
    # ขี้เล่น: ยิ้มกว้างเห็นฟัน (รูปตัว D)
    bm = bmesh.new()
    open_mouth(bm, mats, 0.033, 0.02, z0=MOUTH_Z + 0.004, d_shape=True)
    out.append(mesh_obj("LN_Face_Mouth_playful", bm, mats["mouth_inside"]))
    bm = bmesh.new()
    p, n = surface(0, MOUTH_Z + 0.0)
    rot = n.to_track_quat("Y", "Z").to_matrix()
    # แถวฟันบนชิดขอบบนของปากรูปตัว D
    ellipsoid_bm(bm, p + n * 0.0055 + Vector((0, 0, 0.0085)), (0.027, 0.003, 0.0048), rot=rot)
    out.append(mesh_obj("LN_Face_Teeth_playful", bm, mats["eye_white"]))
    # สงสัย: ปากเบี้ยวเล็ก ๆ
    bm = bmesh.new()
    tube_bm(bm, curve_points(-0.012, 0.022, lambda t: MOUTH_Z - 0.004 + 0.006 * t - 0.004 * math.sin(math.pi * t)), 0.0045)
    out.append(mesh_obj("LN_Face_Mouth_curious", bm, mats["mouth_line"]))
    return out


# ---------- เปลือกตา (ใช้สร้างแววตาตามอารมณ์) ----------
def lid(bm, sx, top_cut, angle_deg):
    """เปลือกตาบนเป็นเปลือกครึ่งทรงกลมสีผิว คลุมลูกตาลงมาถึงระดับ top_cut (0 = ไม่คลุม, 1 = ปิดหมด)"""
    p, n = surface(sx * EYE_X, EYE_Z)
    center = p + Vector((0, 0.012, 0))
    r = Vector(EYE_R) * 1.12
    tmp = bmesh.new()
    ellipsoid_bm(tmp, Vector((0, 0, 0)), r, segs=28, rings=14)
    limit = r.z * (1 - 2 * top_cut)
    geom = [v for v in tmp.verts if v.co.z < limit]
    bmesh.ops.delete(tmp, geom=geom, context="VERTS")
    rot = Matrix.Rotation(math.radians(angle_deg) * sx, 4, "Y")
    bmesh.ops.transform(tmp, matrix=Matrix.Translation(center) @ rot, verts=tmp.verts)
    me = bpy.data.meshes.new("tmp")
    tmp.to_mesh(me)
    tmp.free()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)


def closed_eye(bm, sx, happy=True):
    sign = 1 if happy else -1
    tube_bm(
        bm,
        curve_points(sx * (EYE_X - 0.034), sx * (EYE_X + 0.034), lambda t: EYE_Z - 0.004 + sign * 0.014 * math.sin(math.pi * t), lift=0.006),
        0.005,
    )


LIDS = {
    # (top_cut, angle) ต่อข้าง L, R ; None = ไม่มีเปลือกตา
    "happy": [(0.12, 0), (0.12, 0)],
    "angry": [(0.38, -18), (0.38, -18)],
    "sad": [(0.32, 16), (0.32, 16)],
    "shocked": [None, None],
    "playful": [(0.15, 0), "closed"],
    "curious": [(0.12, 0), (0.42, 0)],
}


def build_lids(mats):
    out = []
    for expr, sides in LIDS.items():
        bm = bmesh.new()
        has = False
        for spec, sx in zip(sides, (1, -1)):
            if spec is None or spec == "closed":
                continue
            lid(bm, sx, *spec)
            has = True
        if has:
            out.append(mesh_obj(f"LN_Face_Lids_{expr}", bm, mats["skin"]))
        if "closed" in sides:
            bm = bmesh.new()
            closed_eye(bm, -1, happy=True)
            out.append(mesh_obj(f"LN_Face_ClosedEye_{expr}", bm, mats["mouth_line"]))
    return out


def build_tears(mats):
    bm = bmesh.new()
    for sx in (1, -1):
        p, n = surface(sx * (EYE_X + 0.018), EYE_Z - 0.048)
        ellipsoid_bm(bm, p - n * 0.004, (0.009, 0.007, 0.014))
    return [mesh_obj("LN_Face_Tears_sad", bm, mats["tear"])]


def face_materials():
    return {
        "skin": bpy.data.materials.get("LN_Skin") or skin_material(),
        "eye_white": material("LN_EyeWhite", (0.98, 0.98, 0.97), roughness=0.15),
        "iris": material("LN_Iris", (0.36, 0.22, 0.12), roughness=0.2),
        "pupil": material("LN_Pupil", (0.03, 0.02, 0.02), roughness=0.1),
        "highlight": material("LN_Highlight", (1, 1, 1), roughness=0.1, emission=1.5),
        "brow": material("LN_Hair", (0.36, 0.22, 0.12), roughness=0.6),
        "mouth_line": material("LN_MouthLine", (0.32, 0.12, 0.1), roughness=0.5),
        "mouth_inside": material("LN_MouthInside", (0.42, 0.12, 0.12), roughness=0.5),
        "blush": material("LN_Blush", (0.98, 0.6, 0.58), roughness=0.6),
        "tear": material("LN_Tear", (0.55, 0.8, 0.98), roughness=0.05),
    }


def parent_to_head(objs):
    rig = bpy.data.objects["LN_Rig"]
    head = rig.data.bones["head"]
    for obj in objs:
        mw = obj.matrix_world.copy()
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = "head"
        obj.matrix_world = mw


def build_face():
    global BVH
    for o in [o for o in bpy.data.objects if o.name.startswith("LN_Face_")]:
        bpy.data.objects.remove(o, do_unlink=True)
    BVH = body_bvh()
    mats = face_materials()
    objs = []
    objs += build_eyes(mats)
    objs += build_nose(mats)
    objs += build_blush(mats)
    objs += build_brows(mats)
    objs += build_mouths(mats)
    objs += build_lids(mats)
    objs += build_tears(mats)
    parent_to_head(objs)
    print("face parts:", len(objs))


def show_expression(expr):
    for o in bpy.data.objects:
        if not o.name.startswith("LN_Face_"):
            continue
        parts = o.name.split("_")
        tag = parts[-1] if parts[-1] in EXPRESSIONS else None
        hide = tag is not None and tag != expr
        # ตาข้างที่หลับ (ขี้เล่น) ซ่อนลูกตาขวา
        if expr == "playful" and o.name.endswith(".R") and any(k in o.name for k in ("Eye", "Iris", "Pupil", "Highlight")):
            hide = True
        o.hide_set(hide)
        o.hide_render = hide


build_face()
show_expression("happy")
