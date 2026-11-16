# ตัวละคร 3D (Lodnamnak)

ไฟล์ที่แอปใช้: `public/models/character.glb` (meshopt, ~3 MB)
ไฟล์แก้ไขใน Blender: `character.blend`

## สร้างใหม่ทั้งหมดใน Blender 5.x

รันแต่ละสคริปต์ตามลำดับใน Blender (Scripting หรือผ่าน MCP) ด้วย
`exec(compile(open(PATH, encoding="utf-8").read(), PATH, "exec"))`

1. `build_rig.py` สร้างร่างกาย (เรียก `build_body.py`) + shape key `Thin` / `Heavy` / `Girl` + โครงกระดูก
2. `build_face.py` ตา คิ้ว จมูก ปาก แก้มแดง น้ำตา และสีหน้า 6 แบบ
3. `build_hair.py` ทรงผม 8 แบบ
4. `build_clothes.py` เสื้อ 9 แบบ กางเกง/กระโปรง 7 แบบ
5. `transfer_keys.py` ให้ชิ้นส่วนที่ไม่ได้ตัดจากผิว (หน้า ปก ฮู้ด กระโปรง) ขยับตามรูปร่าง
6. `export_glb.py` บันทึก `.blend` และ export GLB ไปที่ `public/models/`

สคริปต์ในไฟล์ใช้ path แบบเต็มของโฟลเดอร์โปรเจกต์ ถ้าย้ายโฟลเดอร์ให้แก้ค่า `BASE` / `OUT` ในแต่ละไฟล์

## ชื่อที่แอปอ้างถึง

- shape key: `Thin`, `Heavy`, `Girl` (แอปตั้งค่าจาก BMI และเพศ)
- กระดูก: `hips`, `spine`, `chest`, `neck`, `head`, `upper_arm.L/R`, `forearm.L/R`, `hand.L/R`, `thigh.L/R`, `shin.L/R`, `foot.L/R`
- ชิ้นส่วน: `LN_Hair_<style>`, `LN_Top_<style>[__part]`, `LN_Bottom_<style>[__part]`, `LN_Face_*_<expression>`
- วัสดุที่แอปเปลี่ยนสี: `LN_Skin`, `LN_Hair`, `LN_Cloth_Top`, `LN_Cloth_TopAccent`, `LN_Cloth_Bottom`, `LN_Cloth_BottomAccent`

`render_tools.py` และ `preview_stage.py` ใช้เรนเดอร์ภาพตัวอย่างระหว่างสร้าง (`showcase.png`)
