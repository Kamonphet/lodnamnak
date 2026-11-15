"""แปลงข้อมูล Thai FCD (items.json จากการดึงข้อมูลรายรายการ) เป็นแถวของแท็บ "อาหาร" ใน Google Sheet

ใช้: python -I scripts/data/fcd_to_sheet.py <items.json> <out.json>
ค่าโภชนาการต่อ 100 ก. มาจาก Thai FCD โดยตรง ส่วน "กรัมต่อหน่วย" เป็นค่าประมาณขนาดเสิร์ฟทั่วไปตามประเภทอาหาร
(คอลัมน์ "ที่มาของกรัมต่อหน่วย" ระบุไว้ทุกแถว) ผู้ใช้แก้ในชีตได้
"""
import json
import re
import sys

GROUP_LABEL = {
    "A": "ข้าว แป้ง ธัญพืช", "B": "หัว มัน", "C": "ถั่ว เมล็ด เต้าหู้", "D": "ผัก", "E": "ผลไม้",
    "F": "เนื้อสัตว์", "G": "ปลา อาหารทะเล", "H": "ไข่", "J": "นม", "K": "ไขมัน น้ำมัน", "M": "น้ำตาล ลูกอม",
    "Q": "เครื่องดื่ม", "S": "ฟาสต์ฟู้ด",
}
EST = "ประมาณการขนาดเสิร์ฟทั่วไปตามประเภทอาหาร"

SNACK_RE = re.compile(r"ทอดกรอบ|อบกรอบ|ฉาบ|ข้าวแต๋น|ข้าวเกรียบ|ข้าวตัง|ข้าวแผ่น|มันฝรั่ง|ขนมปังกรอบ|ขนมปังขาไก่|คุกกี้|คุ้กกี้|เวเฟอร์|"
                      r"เมล็ด|นัท|อัลมอนด์|พิชตาชิโอ|มะม่วงหิมพานต์|ถั่วลิสง|ถั่วปากอ้า|ถั่วลันเตา|กรอบเค็ม|กระยาสารท|ปลาแผ่น|เส้น, ปรุงรส|พายกรอบ|ทองม้วน")
DESSERT_START = ("ข้าวเหนียวมูล", "ข้าวต้มมัด", "ข้าวหมาก", "ข้าวเหนียวปิ้ง", "ข้าวโพด")
CURRY_START = ("แกง", "ต้ม", "ซุป", "สตู", "น้ำซุป", "กระเพาะปลา")
SIDE_START = ("กระเพรา", "ผัด", "ยำ", "ลาบ", "ไก่", "หมู", "เนื้อ", "เป็ด", "ทอดมัน", "กบ", "น้ำพริก", "สเต็ก", "กะบับ",
              "หอย", "ไส้กรอก", "ปลาแนม", "น้ำยา", "ซอส", "เต้าหู้", "ไส้เป็ด", "หมี่กรอบ")
NOODLE_START = ("ก๋วยเตี๋ยว", "เส้น", "บะหมี่", "ขนมจีน", "มักกะโรนี", "สปาเก็ตตี้ซอสรส", "หมี่กะทิ")


def serving_for(item):
    """คืน (หมวด, หน่วยบริโภค, กรัม)"""
    g, th = item["group"], item["th"]
    if g == "T":
        # กับข้าวที่ชื่อมีคำว่า "ทอดกรอบ" (เช่น กบผัดเผ็ด) ไม่ใช่ขนมขบเคี้ยว
        if th.startswith(SIDE_START) and not th.startswith(("หมี่กรอบ",)):
            return "กับข้าว", "1 ที่ (100 ก.)", 100
        if SNACK_RE.search(th):
            return "ขนมขบเคี้ยว", "1 ซองเล็ก (30 ก.)", 30
        if th.startswith("ขนมปัง"):
            return "เบเกอรี่", "1 แผ่น/ชิ้น (30 ก.)", 30
        if th.startswith(("เค้ก", "วาฟเฟิล")):
            return "เบเกอรี่", "1 ชิ้น (60 ก.)", 60
        if th.startswith(("ข้าวต้ม", "โจ๊ก", "ก๋วยจั๊บ", "เกี๊ยว")) and not th.startswith("ข้าวต้มมัด"):
            return "อาหารจานเดียว", "1 ชาม (400 ก.)", 400
        if "(เฉพาะข้าว)" in th:
            return "ข้าว แป้ง ธัญพืช", "1 จาน (200 ก.)", 200
        if th.startswith("ข้าว") and not th.startswith(DESSERT_START):
            return "อาหารจานเดียว", "1 จาน (350 ก.)", 350
        if th.startswith(NOODLE_START):
            if "น้ำ" in th.replace("น้ำเงี้ยว", "").replace("น้ำยา", "").replace("น้ำพริก", "") and "แห้ง" not in th:
                return "อาหารจานเดียว", "1 ชาม (450 ก.)", 450
            return "อาหารจานเดียว", "1 จาน (300 ก.)", 300
        if th.startswith("ส้มตำ"):
            return "กับข้าว", "1 จาน (200 ก.)", 200
        if th.startswith(CURRY_START):
            return "แกง ต้ม ซุป", "1 ถ้วย (200 ก.)", 200
        if th.startswith(SIDE_START):
            return "กับข้าว", "1 ที่ (100 ก.)", 100
        return "ขนมหวาน", "1 ถ้วย/ชิ้น (100 ก.)", 100
    if g == "A":
        if re.search(r"สุก|นึ่ง|หุง|ต้ม", th) and th.startswith("ข้าว"):
            return GROUP_LABEL[g], "1 ทัพพี (60 ก.)", 60
        if th.startswith("ขนมปัง"):
            return GROUP_LABEL[g], "1 แผ่น (30 ก.)", 30
        return GROUP_LABEL[g], "100 ก.", 100
    if g == "C" and re.search(r"ลิสง|อัลมอนด์|มะม่วงหิมพานต์|งา|ทานตะวัน|วอลนัท|พิสตาชิโอ|แมคคาเดเมีย|ฟักทอง, เมล็ด|เมล็ด", th):
        return GROUP_LABEL[g], "1 กำมือ (30 ก.)", 30
    if g == "H":
        return GROUP_LABEL[g], "1 ฟอง (50 ก.)", 50
    if g == "J":
        if re.search(r"ชีส|เนยแข็ง", th):
            return GROUP_LABEL[g], "1 แผ่น (20 ก.)", 20
        if re.search(r"โยเกิร์ต|นมเปรี้ยว", th):
            return GROUP_LABEL[g], "1 ถ้วย (150 ก.)", 150
        if th.startswith("นมข้น"):
            return GROUP_LABEL[g], "1 ช้อนโต๊ะ (15 ก.)", 15
        if re.search(r"ผง", th):
            return GROUP_LABEL[g], "1 ช้อนโต๊ะ (10 ก.)", 10
        return GROUP_LABEL[g], "1 แก้ว (200 มล.)", 200
    if g == "Q":
        if "ผง" in th:
            return GROUP_LABEL[g], "1 ซอง (20 ก.)", 20
        return GROUP_LABEL[g], "1 แก้ว (240 มล.)", 240
    if g == "K":
        return GROUP_LABEL[g], "1 ช้อนชา (5 ก.)", 5
    if g == "M":
        return GROUP_LABEL[g], "1 ช้อนโต๊ะ (10 ก.)", 10
    if g == "S":
        return GROUP_LABEL[g], "1 ที่ (150 ก.)", 150
    return GROUP_LABEL[g], "100 ก.", 100


# ชื่อเรียกทั่วไปที่ผู้ใช้พิมพ์ แต่ไม่ตรงกับชื่อทางการใน Thai FCD
ALIASES = {
    "H18": ["ไข่ต้ม", "ไข่ไก่ต้ม"], "H4": ["ไข่เจียว"], "H19": ["ไข่ไก่", "ไข่ดิบ"],
    "A11": ["ข้าวสวย", "ข้าวขาว"], "A23": ["ข้าวเหนียว"], "A59": ["ข้าวกล้อง"],
    "J45": ["นมจืด", "นมวัว", "นมสด", "นมยูเอชที"], "J54": ["นมพร่องมันเนย", "นมไขมันต่ำ"],
    "J61": ["โยเกิร์ต", "โยเกิร์ตรสธรรมชาติ"], "J36": ["เวย์", "เวย์โปรตีน", "whey"],
    "F30": ["อกไก่", "อกไก่ต้ม"], "F111": ["ไก่ย่าง"], "F162": ["หมูกรอบ"], "F163": ["หมูแดง"],
    "F103": ["หมูสับผัด"], "T312": ["ผัดหมี่", "หมี่ผัด", "ผัดหมี่ซีอิ๊ว"], "T9": ["ผัดไทย"],
    "T8": ["ผัดขี้เมา"], "T11": ["ผัดซีอิ๊ว"], "Q10": ["นมถั่วเหลือง", "น้ำเต้าหู้"], "Q40": ["ชานม"],
    "E3": ["กล้วย", "กล้วยน้ำว้า"], "E132": ["แอปเปิ้ล", "แอปเปิล"], "E39": ["ฝรั่ง"], "E82": ["มะละกอ"],
    "E30": ["แตงโม"], "C48": ["เต้าหู้", "เต้าหู้แข็ง"], "C50": ["เต้าหู้อ่อน"], "G86": ["ปลาทู"],
    "G27": ["ปลากะพงนึ่ง"], "T231": ["ส้มตำไทย", "ส้มตำ"], "T103": ["ส้มตำปลาร้า", "ตำลาว"],
    "T59": ["ข้าวมันไก่"], "T64": ["ข้าวหมูแดง"], "T48": ["ข้าวขาหมู"], "T56": ["ข้าวผัดหมู"],
    "T68": ["โจ๊กหมู", "โจ๊ก"], "T51": ["ข้าวต้มหมู"], "T212": ["ต้มยำกุ้ง"], "T211": ["ต้มข่าไก่"],
}


def keywords_for(th, en, code=""):
    kws = set(ALIASES.get(code, []))
    plain = re.sub(r"\s*,\s*", " ", th)
    kws.add(plain)
    if "กระเพรา" in th:
        kws.add(plain.replace("กระเพรา", "กะเพรา"))
    return ", ".join(sorted(k for k in kws if k and k != th))


HEADER = ["รหัส", "ชื่อเมนู", "ชื่ออังกฤษ", "คำค้น", "หมวด", "หน่วยบริโภค", "กรัมต่อหน่วย",
          "พลังงาน (kcal/100 ก.)", "โปรตีน (ก./100 ก.)", "คาร์โบไฮเดรต (ก./100 ก.)", "ไขมัน (ก./100 ก.)",
          "ใยอาหาร (ก./100 ก.)", "น้ำตาล (ก./100 ก.)", "โซเดียม (มก./100 ก.)",
          "kcal ต่อหน่วย", "โปรตีนต่อหน่วย (ก.)", "คาร์บต่อหน่วย (ก.)", "ไขมันต่อหน่วย (ก.)",
          "รหัสในแหล่งข้อมูล", "แหล่งข้อมูล", "ที่มาของกรัมต่อหน่วย", "ใช้ในแอป"]

GROUP_ORDER = "TAHEJQDFGCBKMS"


def main(src, dst):
    items = json.load(open(src, encoding="utf-8"))
    items.sort(key=lambda i: (GROUP_ORDER.index(i["group"]), i["th"]))
    rows = [HEADER]
    skipped = 0
    code_count = {}
    for it in items:
        code_count[it["code"]] = code_count.get(it["code"], 0) + 1
    for it in items:
        n = it.get("nutrients") or {}
        kcal = n.get("kcal") if n.get("kcal") is not None else n.get("kcal_total")
        p, f = n.get("protein"), n.get("fat")
        c = n.get("carb_avail") if n.get("carb_avail") is not None else n.get("carb_total")
        cat, unit, grams = serving_for(it)
        usable = None not in (kcal, p, c, f)
        note = ""
        if usable:
            calc = p * 4 + c * 4 + f * 9
            if abs(calc - kcal) > max(25, kcal * 0.25):
                usable = False
                note = f" (ปิดไว้: kcal ไม่สอดคล้องกับ P/C/F ที่คำนวณได้ {round(calc)})"
        else:
            note = " (ปิดไว้: ข้อมูลพลังงานหรือสารอาหารหลักไม่ครบ)"
        if not usable:
            skipped += 1
        r = len(rows) + 1
        blank = lambda v: "" if v is None else v
        rows.append([
            # Thai FCD มีบางรหัสซ้ำกันคนละอาหาร จึงต่อท้ายด้วยเลขรายการของ Thai FCD
            "fcd_" + it["code"].lower() + (f"_{it['id']}" if code_count[it["code"]] > 1 else ""),
            it["th"] or it["en"], it["en"], keywords_for(it["th"], it["en"], it["code"]), cat, unit, grams,
            blank(kcal), blank(p), blank(c), blank(f), blank(n.get("fibre")), blank(n.get("sugar")), blank(n.get("sodium")),
            f"=IF(H{r}=\"\",\"\",ROUND(H{r}*G{r}/100))",
            f"=IF(I{r}=\"\",\"\",ROUND(I{r}*G{r}/100,1))",
            f"=IF(J{r}=\"\",\"\",ROUND(J{r}*G{r}/100,1))",
            f"=IF(K{r}=\"\",\"\",ROUND(K{r}*G{r}/100,1))",
            it["code"], "Thai FCD (INMU) ต่อ 100 ก. ส่วนที่กินได้", EST + note, usable,
        ])
    json.dump({"values": rows}, open(dst, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"rows: {len(rows) - 1}, disabled: {skipped}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1], sys.argv[2])
