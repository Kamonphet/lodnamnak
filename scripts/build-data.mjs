// แปลงข้อมูลจาก Google Sheet (ไฟล์ dump ของแต่ละแท็บ) เป็น src/data/*.json พร้อมตรวจค่าทุกแถว
//
// ใช้: node scripts/build-data.mjs <foods.json> <combos.json> <exercise.json>
// แต่ละไฟล์คือผลของ Sheets get_values ({ values: [[...header], [...row], ...] }) หรือ array ของแถวโดยตรง
// ถ้ามีแถวผิดเงื่อนไข สคริปต์จะหยุดและไม่เขียนไฟล์
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'data');

function loadRows(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const values = Array.isArray(raw) ? raw : raw.values ?? raw.content?.values;
  if (!Array.isArray(values) || values.length < 1) throw new Error(`${path}: no rows`);
  const [header, ...rows] = values;
  return rows
    .filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
    .map((r, i) => ({ line: i + 2, get: (name) => cell(r, header, name, path) }));
}

function cell(row, header, name, path) {
  const idx = header.indexOf(name);
  if (idx < 0) throw new Error(`${path}: missing column "${name}"`);
  return String(row[idx] ?? '').trim();
}

const errors = [];
const num = (v, where, { required = true, min = 0, max = Infinity } = {}) => {
  if (v === '' || v === '-' ) {
    if (required) errors.push(`${where}: missing number`);
    return undefined;
  }
  const n = Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < min || n > max) {
    errors.push(`${where}: invalid number "${v}"`);
    return undefined;
  }
  return n;
};
const bool = (v) => /^(true|1|yes|ใช่)$/i.test(v);
const keywords = (v) => v.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
const r1 = (n) => (n === undefined ? undefined : Math.round(n * 10) / 10);

// ---------- อาหาร (ค่าต่อ 100 ก. จาก Thai FCD) ----------
const FOOD_COLS = {
  id: 'รหัส', name: 'ชื่อเมนู', en: 'ชื่ออังกฤษ', kw: 'คำค้น', cat: 'หมวด', unit: 'หน่วยบริโภค',
  grams: 'กรัมต่อหน่วย', kcal: 'พลังงาน (kcal/100 ก.)', p: 'โปรตีน (ก./100 ก.)',
  c: 'คาร์โบไฮเดรต (ก./100 ก.)', f: 'ไขมัน (ก./100 ก.)', fb: 'ใยอาหาร (ก./100 ก.)',
  s: 'น้ำตาล (ก./100 ก.)', na: 'โซเดียม (มก./100 ก.)', code: 'รหัสในแหล่งข้อมูล', use: 'ใช้ในแอป',
};

function per100Check(where, kcal, p, c, f) {
  // ตรวจว่าพลังงานใกล้เคียงกับที่คำนวณจาก Atwater (4/4/9) ภายใน ±25% หรือ ±25 kcal
  if ([kcal, p, c, f].some((x) => x === undefined)) return;
  const calc = p * 4 + c * 4 + f * 9;
  if (Math.abs(calc - kcal) > Math.max(25, kcal * 0.25)) {
    errors.push(`${where}: kcal ${kcal} ไม่สอดคล้องกับ P/C/F (คำนวณได้ ${Math.round(calc)})`);
  }
}

const per100ByCode = new Map();
function readFoods(path) {
  const out = [];
  for (const row of loadRows(path)) {
    const g = (k) => row.get(FOOD_COLS[k]);
    const where = `อาหาร แถว ${row.line} (${g('name')})`;
    const code = g('code');
    const inUse = bool(g('use'));
    // แถวที่ปิดไว้ (ใช้ในแอป = FALSE) ไม่ต้องผ่านการตรวจ แต่ยังใช้เป็นส่วนประกอบของเมนูจานเดียวได้ถ้าค่าครบ
    const errCount = errors.length;
    const v = {
      kcal: num(g('kcal'), where, { max: 950 }),
      p: num(g('p'), where, { max: 100 }),
      c: num(g('c'), where, { max: 100 }),
      f: num(g('f'), where, { max: 100 }),
      fb: num(g('fb'), where, { required: false, max: 100 }),
      s: num(g('s'), where, { required: false, max: 100 }),
      na: num(g('na'), where, { required: false, max: 40000 }),
    };
    per100Check(where, v.kcal, v.p, v.c, v.f);
    const complete = errors.length === errCount;
    if (!inUse) errors.length = errCount;
    if (code && complete) per100ByCode.set(code, v);
    if (!inUse) continue;
    const grams = num(g('grams'), where, { min: 1, max: 2000 });
    if (!g('id') || !g('name')) errors.push(`${where}: missing id/name`);
    if (grams === undefined || v.kcal === undefined) continue;
    const k = grams / 100;
    out.push({
      id: g('id'), name: g('name'), nameEn: g('en') || undefined, keywords: keywords(g('kw')),
      category: g('cat'), servingLabel: g('unit') || `${grams} ก.`, servingGrams: grams,
      kcal: Math.round(v.kcal * k), protein: r1(v.p * k), carbs: r1(v.c * k), fat: r1(v.f * k),
      fiber: v.fb === undefined ? undefined : r1(v.fb * k),
      sugar: v.s === undefined ? undefined : r1(v.s * k),
      sodium: v.na === undefined ? undefined : Math.round(v.na * k),
      sourceCode: code || undefined,
    });
  }
  return out;
}

// ---------- เมนูจานเดียว (ประกอบจากหลายรายการ) ----------
function readCombos(path) {
  const out = [];
  for (const row of loadRows(path)) {
    const where = `เมนูจานเดียว แถว ${row.line} (${row.get('ชื่อเมนู')})`;
    if (!bool(row.get('ใช้ในแอป'))) continue;
    let grams = 0;
    const sum = { kcal: 0, p: 0, c: 0, f: 0, fb: 0, s: 0, na: 0 };
    for (const n of [1, 2, 3, 4]) {
      const code = row.get(`ส่วนประกอบ ${n}`);
      if (!code) continue;
      const g = num(row.get(`กรัม ${n}`), where, { min: 1, max: 1500 });
      const v = per100ByCode.get(code);
      if (!v) { errors.push(`${where}: ไม่พบรหัส ${code} ในแท็บอาหาร`); continue; }
      if (g === undefined) continue;
      grams += g;
      for (const key of Object.keys(sum)) sum[key] += ((v[key] ?? 0) * g) / 100;
    }
    if (grams === 0) { errors.push(`${where}: ไม่มีส่วนประกอบ`); continue; }
    out.push({
      id: row.get('รหัส'), name: row.get('ชื่อเมนู'), keywords: keywords(row.get('คำค้น')),
      category: row.get('หมวด'), servingLabel: row.get('หน่วยบริโภค') || `${grams} ก.`, servingGrams: grams,
      kcal: Math.round(sum.kcal), protein: r1(sum.p), carbs: r1(sum.c), fat: r1(sum.f),
      fiber: r1(sum.fb), sugar: r1(sum.s), sodium: Math.round(sum.na),
    });
  }
  return out;
}

// ---------- ออกกำลังกาย (MET จาก Compendium) ----------
function readExercise(path) {
  const out = [];
  for (const row of loadRows(path)) {
    const where = `ออกกำลังกาย แถว ${row.line} (${row.get('ชื่อกิจกรรม')})`;
    const mets = {
      light: num(row.get('MET เบา'), where, { min: 1, max: 25 }),
      moderate: num(row.get('MET ปานกลาง'), where, { min: 1, max: 25 }),
      vigorous: num(row.get('MET หนัก'), where, { min: 1, max: 25 }),
    };
    if (mets.light > mets.moderate || mets.moderate > mets.vigorous) {
      errors.push(`${where}: MET ต้องเรียง เบา ≤ ปานกลาง ≤ หนัก`);
    }
    out.push({
      id: row.get('รหัส'), label: row.get('ชื่อกิจกรรม'), keywords: keywords(row.get('คำค้น')),
      category: row.get('หมวด'), shortcut: bool(row.get('ปุ่มลัดในแอป')),
      defaultMinutes: num(row.get('นาทีเริ่มต้น'), where, { min: 5, max: 300 }), mets,
    });
  }
  return out;
}

const [foodsPath, combosPath, exercisePath] = process.argv.slice(2);
if (!foodsPath || !combosPath || !exercisePath) {
  console.error('usage: node scripts/build-data.mjs <foods.json> <combos.json> <exercise.json>');
  process.exit(1);
}

const foods = readFoods(foodsPath);
const combos = readCombos(combosPath);
const exercises = readExercise(exercisePath);

const ids = new Set();
for (const item of [...combos, ...foods]) {
  if (ids.has(item.id)) errors.push(`รหัสซ้ำ: ${item.id}`);
  ids.add(item.id);
}

if (errors.length) {
  console.error(`พบปัญหา ${errors.length} รายการ:\n- ` + errors.slice(0, 60).join('\n- '));
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const generatedAt = new Date().toISOString();
writeFileSync(join(outDir, 'foods.json'), JSON.stringify({ generatedAt, foods: [...combos, ...foods] }));
writeFileSync(join(outDir, 'exercises.json'), JSON.stringify({ generatedAt, exercises }, null, 1));
console.log(`foods: ${combos.length} combos + ${foods.length} items, exercises: ${exercises.length}`);
