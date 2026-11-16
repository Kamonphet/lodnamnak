"""ขั้นที่ 5: เสื้อผ้า สร้างจากผิวของร่างกาย (คัดลอกส่วนที่ต้องการแล้วดันออก) จึงมี shape key และน้ำหนักกระดูก
ชุดเดียวกับร่างกาย และพอดีตัวทุกรูปร่างโดยอัตโนมัติ

ชื่อวัตถุ: LN_Top_<type>, LN_Bottom_<type> (+ ชิ้นประกอบ LN_Top_<type>__<part>)
วัสดุ: LN_Cloth_Top / LN_Cloth_TopAccent / LN_Cloth_Bottom / LN_Cloth_BottomAccent / LN_Cloth_Detail
แอปเปลี่ยนสีวัสดุเหล่านี้ได้ทีละชุด
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

BASE = r"D:\COM\Programing\Lodnamnak\art\character\\"
exec(compile(open(BASE + "materials.py", encoding="utf-8").read(), "materials", "exec"))

ARM_ANGLE = math.radians(40)
SHOULDER = Vector((0.118, 0.0, 0.555))
ARM_LEN = 0.27
HIP_Z, ANKLE_Z = 0.345, 0.075
COLL = "LN_Character"


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def part_info(co):
    x, z = abs(co.x), co.z
    arm = x > 0.125 and 0.3 < z < 0.6
    d = Vector((math.cos(ARM_ANGLE), 0, -math.sin(ARM_ANGLE)))
    arm_t = (Vector((x, 0, z)) - Vector((SHOULDER.x, 0, SHOULDER.z))).dot(d) / ARM_LEN
    leg = z < 0.33 and x < 0.12
    leg_t = (HIP_Z - z) / (HIP_Z - ANKLE_Z)
    neck = z > 0.585 and not arm
    return arm, arm_t, leg, leg_t, neck


# ---------- เงื่อนไขพื้นที่ของแต่ละชุด (ตำแหน่งในท่า A-pose) ----------
def m_torso(co, low=0.405, neck_z=0.588):
    arm, arm_t, leg, leg_t, neck = part_info(co)
    return not arm and not leg and low <= co.z <= neck_z


def top_mask(sleeve_t, low=0.405, scoop=False):
    def fn(co):
        arm, arm_t, leg, leg_t, neck = part_info(co)
        if arm:
            return arm_t <= sleeve_t
        if scoop and co.y < -0.02 and abs(co.x) < 0.055 and co.z > 0.545:
            return False
        return m_torso(co, low=low)

    return fn


def bottom_mask(leg_end, top=0.43):
    def fn(co):
        arm, arm_t, leg, leg_t, neck = part_info(co)
        if arm:
            return False
        if co.z > top:
            return False
        if leg:
            return leg_t <= leg_end
        return True

    return fn


def accent_sleeve_end(width):
    def fn(co):
        arm, arm_t, *_ = part_info(co)
        return arm

    return fn


# ---------- เครื่องมือ ----------
def link(obj):
    bpy.data.collections[COLL].objects.link(obj)
    return obj


def body_copy(name):
    body = bpy.data.objects["LN_Body"]
    obj = body.copy()
    obj.data = body.data.copy()
    obj.name = obj.data.name = name
    link(obj)
    for m in obj.modifiers:
        if m.type == "ARMATURE":
            m.object = bpy.data.objects["LN_Rig"]
    return obj


def make_garment(name, mask, offset, mats, accent=None, accent_mat=1):
    """คัดลอกผิวร่างกายตาม mask แล้วดันออกตาม normal เท่ากันทุก shape key"""
    obj = body_copy(name)
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    layers = list(bm.verts.layers.shape.values())
    kill = [v for v in bm.verts if not mask(v.co)]
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    # ตัดเศษชิ้นเล็กที่หลุดออกมา
    for v in [v for v in bm.verts if not v.link_faces]:
        bm.verts.remove(v)
    for v in bm.verts:
        n = v.normal.copy()
        v.co += n * offset
        for lay in layers:
            v[lay] += n * offset
    for f in bm.faces:
        f.material_index = 0
        if accent and all(accent(v.co) for v in f.verts):
            f.material_index = accent_mat
    # ตั้งช่องวัสดุก่อนเขียน mesh (ถ้าล้างช่องทีหลัง Blender จะรีเซ็ตเลขช่องของหน้าเป็น 0)
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    bm.to_mesh(me)
    bm.free()
    return obj


ARM_DIR = {sx: Vector((sx * math.cos(ARM_ANGLE), 0, -math.sin(ARM_ANGLE))) for sx in (1, -1)}


def arm_plane(sx, t):
    co = SHOULDER * Vector((sx, 1, 1)) + ARM_DIR[sx] * ARM_LEN * t
    return co, ARM_DIR[sx]


def cut_garment(name, keep, cuts, offset, mats, accent=None, accent_mat=1, split_cuts=()):
    """คัดลอกผิวร่างกาย ลบส่วนที่ไกล (keep) แล้วตัดขอบด้วยระนาบให้ชายผ้าตรงเรียบ

    cuts: [(co, normal, region_fn)] ลบด้านที่ normal ชี้ไป เฉพาะหน้าที่ region_fn(center) เป็นจริง (None = ทั้งหมด)
    """
    obj = body_copy(name)
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    layers = list(bm.verts.layers.shape.values())
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context="VERTS")
    for co, no, region in cuts:
        faces = [f for f in bm.faces if region is None or region(f.calc_center_median())]
        if not faces:
            continue
        geom = list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=True, dist=1e-5)
        # จุดใหม่บนรอยตัด: ค่า shape key ประมาณจากระยะเดิม (ใช้ basis offset ของจุดข้างเคียง)
    # จุดที่เกิดจากการตัดได้ค่าใน layer ของ shape key แบบเฉลี่ยจาก bmesh อัตโนมัติ
    # ตัดแบ่งหน้า (ไม่ลบ) ตามแนวเปลี่ยนสี เพื่อให้ขอบสีตรงเรียบ
    for co, no, region in split_cuts:
        faces = [f for f in bm.faces if region is None or region(f.calc_center_median())]
        if faces:
            geom = list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces
            bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, dist=1e-5)
    for v in [v for v in bm.verts if not v.link_faces]:
        bm.verts.remove(v)
    bm.normal_update()
    for v in bm.verts:
        n = v.normal.copy()
        v.co += n * offset
        for lay in layers:
            v[lay] += n * offset
    for f in bm.faces:
        f.material_index = 0
        if accent and accent(f.calc_center_median()):
            f.material_index = accent_mat
    # ตั้งช่องวัสดุก่อนเขียน mesh (ถ้าล้างช่องทีหลัง Blender จะรีเซ็ตเลขช่องของหน้าเป็น 0)
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    bm.to_mesh(me)
    bm.free()
    return obj


def is_arm(sx):
    return lambda c: (c.x * sx) > 0.12 and 0.3 < c.z < 0.62


def top_cut(name, sleeve_t, offset, mats, low=0.405, neck=0.588, cuff_t=None, hem_z=None, raglan=False):
    """ชิ้นเสื้อ: cuff_t = จุดเริ่มปลายแขนสีตัดกัน, hem_z = ขอบล่างสีตัดกัน, raglan = แขนทั้งแขนเป็นสีตัดกัน"""
    keep = lambda co: co.z > low - 0.03 and co.z < neck + 0.02 and not (abs(co.x) < 0.12 and co.z < 0.33)
    cuts = [((0, 0, neck), (0, 0, 1), lambda c: abs(c.x) < 0.13), ((0, 0, low), (0, 0, -1), lambda c: abs(c.x) < 0.14)]
    splits = []
    for sx in (1, -1):
        co, no = arm_plane(sx, sleeve_t)
        cuts.append((co, no, is_arm(sx)))
        if cuff_t is not None:
            splits.append((*arm_plane(sx, cuff_t), is_arm(sx)))
        if raglan:
            splits.append((*arm_plane(sx, 0.02), is_arm(sx)))
    if hem_z is not None:
        splits.append(((0, 0, hem_z), (0, 0, 1), lambda c: abs(c.x) < 0.14))

    def accent(c):
        arm, arm_t, *_ = part_info(c)
        if raglan and arm and arm_t > 0.02:
            return True
        if cuff_t is not None and arm and arm_t > cuff_t:
            return True
        return hem_z is not None and not arm and c.z < hem_z

    has_accent = raglan or cuff_t is not None or hem_z is not None
    return cut_garment(name, keep, cuts, offset, mats, accent=accent if has_accent else None, split_cuts=splits)


def bottom_cut(name, leg_end, offset, mats, top=0.43, cuff_t=None):
    z_end = HIP_Z - (HIP_Z - ANKLE_Z) * leg_end
    splits, accent = (), None
    if cuff_t is not None:
        z_cuff = HIP_Z - (HIP_Z - ANKLE_Z) * cuff_t
        splits = [((0, 0, z_cuff), (0, 0, 1), None)]
        accent = lambda c: c.z < z_cuff
    keep = lambda co: co.z < top + 0.02 and not (abs(co.x) > 0.125 and co.z > 0.26)
    cuts = [((0, 0, top), (0, 0, 1), None), ((0, 0, z_end), (0, 0, -1), None)]
    return cut_garment(name, keep, cuts, offset, mats, accent=accent, split_cuts=splits)


def add_scaled_keys(obj, center_fn, heavy=0.03, thin=-0.015, girl=0.0):
    """ชิ้นแข็ง (ปก ฮู้ด กระโปรง): สร้าง shape key ชื่อเดียวกับร่างกายด้วยการขยายรอบแกนกลาง"""
    obj.shape_key_add(name="Basis", from_mix=False)
    base = [v.co.copy() for v in obj.data.vertices]
    for name, amt in (("Thin", thin), ("Heavy", heavy), ("Girl", girl)):
        key = obj.shape_key_add(name=name, from_mix=False)
        for i, co in enumerate(base):
            c = center_fn(co)
            d = Vector((co.x - c.x, co.y - c.y, 0))
            if d.length > 1e-6:
                key.data[i].co = co + d.normalized() * amt * (1 if callable(amt) is False else 1)
            else:
                key.data[i].co = co


def rigid_part(name, bm, mat, bone, keys=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    obj = link(bpy.data.objects.new(name, me))
    assign(obj, mat)
    if keys:
        add_scaled_keys(obj, *keys)
    rig = bpy.data.objects["LN_Rig"]
    mw = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_world = mw
    return obj


def ellipsoid(bm, center, radii, segs=24, rings=12, rot=None):
    m = Matrix.Translation(center)
    if rot is not None:
        m = m @ rot.to_4x4()
    m = m @ Matrix.Diagonal((*radii, 1.0))
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0, matrix=m)


def torus(bm, center, major, minor, scale_y=0.85, segs=32, rings=10):
    me = bpy.data.meshes.new("tmp")
    tmp = bmesh.new()
    for i in range(segs):
        a = 2 * math.pi * i / segs
        for j in range(rings):
            b = 2 * math.pi * j / rings
            r = major + minor * math.cos(b)
            tmp.verts.new(center + Vector((r * math.cos(a), r * math.sin(a) * scale_y, minor * math.sin(b))))
    tmp.verts.ensure_lookup_table()
    for i in range(segs):
        for j in range(rings):
            a = i * rings + j
            b = i * rings + (j + 1) % rings
            c = ((i + 1) % segs) * rings + (j + 1) % rings
            d = ((i + 1) % segs) * rings + j
            tmp.faces.new((tmp.verts[a], tmp.verts[b], tmp.verts[c], tmp.verts[d]))
    tmp.to_mesh(me)
    tmp.free()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)


def axis_z(co):
    return Vector((0, 0, co.z))


# ---------- ชุด ----------
def cloth_mats():
    return {
        "top": material("LN_Cloth_Top", (0.85, 0.3, 0.3), roughness=0.85),
        "top_acc": material("LN_Cloth_TopAccent", (0.95, 0.95, 0.95), roughness=0.85),
        "bottom": material("LN_Cloth_Bottom", (0.2, 0.3, 0.6), roughness=0.85),
        "bottom_acc": material("LN_Cloth_BottomAccent", (0.9, 0.9, 0.9), roughness=0.85),
        "detail": material("LN_Cloth_Detail", (0.92, 0.9, 0.86), roughness=0.5),
    }


def cuff(t0):
    def fn(co):
        arm, arm_t, *_ = part_info(co)
        return arm and arm_t >= t0

    return fn


def hem_band(z_max):
    def fn(co):
        arm, *_ = part_info(co)
        return not arm and co.z <= z_max

    return fn


def leg_cuff(t0):
    def fn(co):
        arm, arm_t, leg, leg_t, neck = part_info(co)
        return leg and leg_t >= t0

    return fn


def collar(name, M, flat=True):
    bm = bmesh.new()
    torus(bm, Vector((0, 0, 0.592)), 0.058, 0.011, scale_y=0.82)
    if flat:
        # ปกพับสองข้างด้านหน้า
        for sx in (-1, 1):
            ellipsoid(bm, Vector((sx * 0.03, -0.055, 0.578)), (0.03, 0.006, 0.02), rot=Matrix.Rotation(sx * 0.5, 3, "Y"))
    return rigid_part(name, bm, M["top_acc"], "chest", keys=(axis_z, 0.018, -0.008))


def buttons(name, M, count=4, z0=0.56, z1=0.42):
    bm = bmesh.new()
    for i in range(count):
        z = z0 + (z1 - z0) * i / max(1, count - 1)
        ellipsoid(bm, Vector((0, -0.094 - 0.012 * math.exp(-(((z - 0.44) / 0.06) ** 2)), z)), (0.007, 0.004, 0.007), segs=12, rings=6)
    return rigid_part(name, bm, M["detail"], "spine", keys=(lambda co: Vector((0, 0.0, co.z)), 0.045, -0.02))


def build_tops(M):
    T = [M["top"], M["top_acc"]]
    out = []
    out.append(top_cut("LN_Top_tank", 0.02, 0.005, T))
    out.append(top_cut("LN_Top_tshirt", 0.36, 0.008, T))
    out.append(top_cut("LN_Top_raglan", 0.4, 0.008, T, raglan=True))
    out += [top_cut("LN_Top_polo", 0.34, 0.008, T, cuff_t=0.29), collar("LN_Top_polo__collar", M), buttons("LN_Top_polo__buttons", M, count=2, z0=0.565, z1=0.535)]
    out += [top_cut("LN_Top_buttonup", 0.35, 0.009, T), collar("LN_Top_buttonup__collar", M), buttons("LN_Top_buttonup__buttons", M, count=4)]
    out.append(top_cut("LN_Top_sweater", 0.97, 0.012, T, cuff_t=0.88, hem_z=0.43))
    hoodie = top_cut("LN_Top_hoodie", 0.97, 0.014, T, low=0.39, cuff_t=0.88, hem_z=0.415)
    bm = bmesh.new()
    # ฮู้ดพับอยู่ด้านหลังคอ + เชือกฮู้ด
    torus(bm, Vector((0, 0.03, 0.6)), 0.075, 0.03, scale_y=0.95)
    ellipsoid(bm, Vector((0, 0.1, 0.62)), (0.085, 0.04, 0.06))
    for sx in (-1, 1):
        ellipsoid(bm, Vector((sx * 0.025, -0.085, 0.545)), (0.004, 0.004, 0.03), segs=8, rings=6)
    out += [hoodie, rigid_part("LN_Top_hoodie__hood", bm, M["top"], "chest", keys=(axis_z, 0.02, -0.008))]
    jacket = top_cut("LN_Top_jacket", 0.98, 0.016, T, cuff_t=0.9, hem_z=0.43)
    bm = bmesh.new()
    for i in range(10):
        z = 0.585 - i * 0.019
        ellipsoid(bm, Vector((0, -0.1 - 0.012 * math.exp(-(((z - 0.44) / 0.06) ** 2)), z)), (0.004, 0.003, 0.009), segs=8, rings=6)
    out += [jacket, collar("LN_Top_jacket__collar", M, flat=False), rigid_part("LN_Top_jacket__zip", bm, M["detail"], "spine", keys=(lambda co: Vector((0, 0, co.z)), 0.045, -0.02))]
    blouse = top_cut("LN_Top_puff", 0.3, 0.008, T)
    bm = bmesh.new()
    for sx in (-1, 1):
        c = SHOULDER * Vector((sx, 1, 1)) + ARM_DIR[sx] * ARM_LEN * 0.13
        ellipsoid(bm, c, (0.058, 0.055, 0.05), rot=Matrix.Rotation(sx * -ARM_ANGLE, 3, "Y"))
    out += [blouse, rigid_part("LN_Top_puff__sleeves", bm, M["top"], "chest", keys=(axis_z, 0.015, -0.006))]
    return out


def build_bottoms(M):
    B = [M["bottom"], M["bottom_acc"]]
    out = []
    out.append(bottom_cut("LN_Bottom_shorts", 0.42, 0.01, B))
    out.append(bottom_cut("LN_Bottom_pants", 0.97, 0.01, B))
    out.append(bottom_cut("LN_Bottom_joggers", 0.95, 0.013, B, cuff_t=0.85))
    out.append(bottom_cut("LN_Bottom_leggings", 0.93, 0.004, B))
    # เอี๊ยมกางเกงขาสั้น: กางเกง + แผ่นอก + สายสะพาย (มาจากผิวร่างกายเหมือนกัน)
    def overall_mask(co):
        arm, arm_t, leg, leg_t, neck = part_info(co)
        if bottom_mask(0.4, top=0.44)(co):
            return True
        bib = co.y < 0 and abs(co.x) < 0.06 and co.z <= 0.53 and not arm
        strap = (not arm) and 0.045 < abs(co.x) < 0.07 and co.z <= 0.6
        return bib or strap

    shorts = bottom_cut("LN_Bottom_overalls", 0.4, 0.013, B, top=0.44)
    # แผ่นอกและสายสะพาย: ตัดจากผิวร่างกายด้วยระนาบ
    keep = lambda co: 0.4 < co.z < 0.62 and abs(co.x) < 0.12
    bib = cut_garment(
        "LN_Bottom_overalls__bib",
        keep,
        [((0, 0, 0.53), (0, 0, 1), lambda c: abs(c.x) < 0.045 or c.y < -0.05),
         ((0.06, 0, 0), (1, 0, 0), None), ((-0.06, 0, 0), (-1, 0, 0), None),
         ((0, 0, 0.425), (0, 0, -1), None)],
        0.016,
        B,
    )
    out += [shorts, bib]
    # กระโปรงจีบ / ทรงเอ: กรวยจากเอวบานลง
    for name, flare, pleats in (("LN_Bottom_skirt_pleated", 0.05, 14), ("LN_Bottom_skirt_aline", 0.035, 0)):
        bm = bmesh.new()
        segs, rows = 56, 8
        verts = []
        for r in range(rows + 1):
            t = r / rows
            z = 0.44 - 0.17 * t
            row = []
            for i in range(segs):
                a = 2 * math.pi * i / segs
                wave = 0.006 * math.cos(a * pleats) * t if pleats else 0.0
                rx = 0.122 + flare * t + wave
                ry = 0.098 + flare * 0.8 * t + wave
                row.append(bm.verts.new((rx * math.cos(a), ry * math.sin(a) + 0.004, z)))
            verts.append(row)
        for r in range(rows):
            for i in range(segs):
                bm.faces.new((verts[r][i], verts[r][(i + 1) % segs], verts[r + 1][(i + 1) % segs], verts[r + 1][i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        out.append(rigid_part(name, bm, M["bottom"], "hips", keys=(axis_z, 0.045, -0.02)))
    return out


def build_clothes():
    for o in [o for o in bpy.data.objects if o.name.startswith(("LN_Top_", "LN_Bottom_"))]:
        bpy.data.objects.remove(o, do_unlink=True)
    M = cloth_mats()
    tops = build_tops(M)
    bottoms = build_bottoms(M)
    for o in tops + bottoms:
        o.hide_set(True)
        o.hide_render = True
    print("tops:", sorted({o.name.split("__")[0] for o in tops}))
    print("bottoms:", sorted({o.name for o in bottoms}))


def show_outfit(top, bottom):
    for o in bpy.data.objects:
        if o.name.startswith("LN_Top_"):
            vis = o.name.split("__")[0] == "LN_Top_" + top
        elif o.name.startswith("LN_Bottom_"):
            vis = o.name.split("__")[0] == "LN_Bottom_" + bottom
        else:
            continue
        o.hide_set(not vis)
        o.hide_render = not vis


build_clothes()
