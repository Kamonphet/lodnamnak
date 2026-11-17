import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseNutritionFactsText } from '../domain/labelOcrParser';
import { buildCharset, ctcDecode, fixScripts, invalidShare, readImage, readingOrder, thaiCanonical } from '../domain/openthaiOcr';
import { createOrtRunner } from '../domain/openthaiOcrRuntime';

const root = join(__dirname, '../..');

describe('OpenThai OCR text handling', () => {
  it('canonicalises Thai mark order and sara am', () => {
    expect(thaiCanonical('นํ้า')).toBe('น้ำ');
    expect(thaiCanonical('เเ​ละ  x ')).toBe('และ x');
  });

  it('fixes look-alike scripts', () => {
    expect(fixScripts('Wลังงาน')).toBe('พลังงาน');
    expect(fixScripts('๑O')).toBe('๑๐');
  });

  it('scores broken Thai spelling', () => {
    expect(invalidShare('ข้อมูลโภชนาการ')).toBe(0);
    expect(invalidShare('ูี้ ไ้')).toBeGreaterThan(0.5);
  });

  it('decodes CTC: collapses repeats, drops blanks', () => {
    const charset = buildCharset('a\nb\n');
    // frames: a a blank a b  (C = 4: blank, a, b, space)
    const frames = [1, 1, 0, 1, 2];
    const p = new Float32Array(frames.length * 4);
    frames.forEach((c, t) => (p[t * 4 + c] = 0.9));
    expect(ctcDecode(p, 0, frames.length, 4, charset)).toEqual({ text: 'aab', conf: expect.closeTo(0.9, 5) });
  });

  it('orders boxes in rows, left to right', () => {
    const box = (x: number, y: number, w: number): [number, number][] => [
      [x, y],
      [x + w, y],
      [x + w, y + 20],
      [x, y + 20],
    ];
    const boxes = [box(400, 52, 60), box(10, 50, 200), box(10, 100, 200)] as never;
    expect(readingOrder(boxes)).toEqual([[1, 0], [2]]);
  });
});

describe('nutrition parser with OCR slips', () => {
  it('reads values when Thai marks are dropped and O stands for 0', () => {
    const p = parseNutritionFactsText(
      [
        'พลังงานหังหมด 150 กิโลแคลอรี (พลังงานจากไขมัน 60 กิโลแคลอรี)',
        'ไขมันทังหมด 7 ก. 11%',
        'โคเลสเตอรอล O มก. O%',
        'คาร์โบไฮเดรตหังหมด 19 ก. 6%',
        'น้าตาล 5 ก.',
        'โซเดียม 180 มก. 8%',
      ].join('\n'),
    );
    expect(p).toMatchObject({ calories: 150, fatGrams: 7, carbsGrams: 19, sugarGrams: 5, sodiumMg: 180 });
  });

  it('reads values when a letter of the keyword is misread', () => {
    const p = parseNutritionFactsText(
      ['พลั้งงานทั้งหมด 130 กิโลแคลอรี', 'ไขมันอิ่มตัว 3 ก.', 'ไขมันทั้งหมด 5 ก.8%', 'โปรดีน7 ก.', 'น้ำตาผ 12ก.'].join('\n'),
    );
    expect(p).toMatchObject({ calories: 130, fatGrams: 5, proteinGrams: 7, sugarGrams: 12 });
  });
});

describe('nutrition parser on table rows', () => {
  it('never takes a milligram value as energy, and estimates energy from macros', () => {
    // OCR output of a real tray-meal label: energy misread, protein label lost
    const p = parseNutritionFactsText(
      [
        'ข้อมลโกชนากาS',
        'ฟล้งาบ 20 ก็โคลจคลอร',
        'โซบ้นทั้งหมด 9 ก. Y',
        'ไซบ้นอิ่มล้ว 5 N 25N',
        'คอเลศเฉอSอA 20 Uก. 7%',
        '14 ก.',
        'คาร์โบไฮเosดกั้งหมด 38 ก. 13',
        'น้ำดาคทั้งหมด 10 ก',
        'ไซเฉียม 760 Uก. 38 Y',
        'โพแกสเซียบ 370 บก.',
        'ยล้งพาว้นค: ,000 กีลเคอรี',
      ].join('\n'),
    );
    expect(p).toMatchObject({ fatGrams: 9, proteinGrams: 14, carbsGrams: 38, sugarGrams: 10, sodiumMg: 760, productName: '' });
    expect(p.calories).toBeGreaterThanOrEqual(280);
    expect(p.calories).toBeLessThanOrEqual(300);
    expect(p.estimatedFields).toEqual(['calories']);
    expect(p.missingFields).toEqual([]);
  });

  it('leaves a value empty when only the % column was read', () => {
    // same photo after JPEG: the "38 ก." and "290 กิโลแคลอรี" boxes were not detected
    const p = parseNutritionFactsText(
      [
        'ข้อมลโกชนากาS',
        'แล้งงาป',
        'รอวจะรวงคาจ้างจ้งวอว้บ',
        'โซบ้นทั้งหมด 9 ก. Y',
        'ไซบ้นอิ่มฉิว 5 N 25N',
        'คอเลศเฉอSอA 20 Uก. 7%',
        '14 ก.',
        'คาร์ไบไฮเasดกั้งหมด 13',
        'น้ำดาคทั้งหมด 10 ก',
        'โซเดียบ 760 Uถ. 38 N',
        'แล้พานว้นค: ,000 กีลแคลอร',
      ].join('\n'),
    );
    expect(p).toMatchObject({ fatGrams: 9, proteinGrams: 14, carbsGrams: 0, calories: 0, productName: '' });
    expect(p.missingFields).toEqual(['calories', 'carbsGrams']);
  });

  it('keeps a read energy value that agrees with the macros', () => {
    const p = parseNutritionFactsText(['พลังงาน 290 กิโลแคลอรี', 'ไขมันทั้งหมด 9 ก.', 'โปรตีน 14 ก.', 'คาร์โบไฮเดรตทั้งหมด 38 ก.', 'โซเดียม 760 มก.'].join('\n'));
    expect(p).toMatchObject({ calories: 290, estimatedFields: [] });
  });

  it('marks values it could not read instead of guessing', () => {
    const p = parseNutritionFactsText(['ข้อมูลโภชนาการ', 'โซเดียม 760 มก.', 'พลังงาน 290 กิโลแคลอรี'].join('\n'));
    expect(p.calories).toBe(290);
    expect(p.missingFields).toEqual(['proteinGrams', 'carbsGrams', 'fatGrams']);
    expect(p.productName).toBe('');
  });

  it('does not flag sesame because of the word พลังงาน', () => {
    expect(parseNutritionFactsText('พลังงาน 120 กิโลแคลอรี').detectedAllergens).not.toContain('งา');
    expect(parseNutritionFactsText('ส่วนประกอบ: แป้ง งาขาว').detectedAllergens).toContain('งา');
  });
});

describe('OpenThai OCR on rendered labels', () => {
  const load = (name: string, width: number, height: number) => ({
    width,
    height,
    data: new Uint8Array(gunzipSync(readFileSync(join(__dirname, 'fixtures', `${name}.rgba.gz`)))),
  });

  it('reads a Thai and an English label', async () => {
    const runner = await createOrtRunner(
      readFileSync(join(root, 'public/openthai-ocr/det.onnx')),
      readFileSync(join(root, 'public/openthai-ocr/rec.onnx')),
      readFileSync(join(root, 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm')),
    );
    const charset = buildCharset(readFileSync(join(root, 'public/openthai-ocr/rec_dict.txt'), 'utf8'));

    const th = await readImage(load('th_clean', 900, 702), runner, charset);
    expect(th.text).toContain('ข้อมูลโภชนาการ');
    expect(parseNutritionFactsText(th.text)).toMatchObject({
      calories: 150,
      proteinGrams: 2,
      carbsGrams: 19,
      fatGrams: 7,
      sugarGrams: 5,
      sodiumMg: 180,
    });

    const en = await readImage(load('en_clean', 900, 597), runner, charset);
    expect(en.text).toContain('Nutrition Facts');
    expect(parseNutritionFactsText(en.text)).toMatchObject({
      calories: 210,
      proteinGrams: 8,
      carbsGrams: 26,
      fatGrams: 8,
      sugarGrams: 25,
      sodiumMg: 125,
    });
  }, 60_000);

  it('reads a phone photo of a tray-meal label', async () => {
    const runner = await createOrtRunner(
      readFileSync(join(root, 'public/openthai-ocr/det.onnx')),
      readFileSync(join(root, 'public/openthai-ocr/rec.onnx')),
      readFileSync(join(root, 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm')),
    );
    const charset = buildCharset(readFileSync(join(root, 'public/openthai-ocr/rec_dict.txt'), 'utf8'));
    const photo = await readImage(load('th_tray_photo', 824, 830), runner, charset);
    const p = parseNutritionFactsText(photo.text);
    expect(p).toMatchObject({ proteinGrams: 14, carbsGrams: 38, fatGrams: 9, sodiumMg: 760, missingFields: [] });
    expect(Math.abs(p.calories - 290)).toBeLessThanOrEqual(10);
  }, 60_000);
});
