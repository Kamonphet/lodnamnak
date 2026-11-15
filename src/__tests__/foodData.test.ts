import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG, EXERCISE_DATA } from '../domain/exercisePlanner';
import { getPersonalizedMealSuggestions, parseFoodInput } from '../domain/foodAnalyzer';
import { extractFoodCount, FOODS, findBestFoodMatch, searchFoods } from '../domain/foodDatabase';
import { MET_ACTIVITIES } from '../domain/metActivities';

describe('food database (synced from Google Sheet / Thai FCD)', () => {
  it('has unique ids and sane values for every item', () => {
    const ids = new Set<string>();
    for (const f of FOODS) {
      expect(ids.has(f.id), f.id).toBe(false);
      ids.add(f.id);
      expect(f.servingGrams, f.name).toBeGreaterThan(0);
      expect(f.kcal, f.name).toBeGreaterThanOrEqual(0);
      // พลังงานต้องสอดคล้องกับ P/C/F (Atwater 4/4/9) ภายใน ±25% หรือ ±40 kcal
      const calc = f.protein * 4 + f.carbs * 4 + f.fat * 9;
      expect(Math.abs(calc - f.kcal), f.name).toBeLessThanOrEqual(Math.max(40, f.kcal * 0.25));
    }
    expect(FOODS.length).toBeGreaterThan(500);
  });

  it('logs popular plates from the database instead of guessing', () => {
    const { items, unmatched } = parseFoodInput('ข้าวกะเพราหมูสับไข่ดาว');
    expect(unmatched).toEqual([]);
    expect(items[0].normalizedName).toBe('ข้าวกะเพราหมูสับไข่ดาว');
    expect(items[0].calories).toBeGreaterThan(500);
    expect(items[0].calories).toBeLessThan(900);
    expect(items[0].carbsGrams).toBeGreaterThan(40);
    expect(items[0].isEstimated).toBe(false);
  });

  it('finds Thai FCD dishes with common spelling variants', () => {
    expect(findBestFoodMatch('กระเพราไก่')?.id).toBe(findBestFoodMatch('กะเพราไก่')?.id);
    expect(searchFoods('ผัดไทย').some((f) => f.name.includes('ผัดไทย'))).toBe(true);
    expect(searchFoods('ต้มยำกุ้ง').length).toBeGreaterThan(0);
  });

  it('scales by the typed count', () => {
    expect(extractFoodCount('ไข่ต้ม 2 ฟอง')).toEqual({ count: 2, text: 'ไข่ต้ม' });
    const one = parseFoodInput('ข้าวสวย 1 จาน').items[0];
    const two = parseFoodInput('ข้าวสวย 2 จาน').items[0];
    expect(two.calories).toBeCloseTo(one.calories * 2, -1);
  });

  it('every quick-add chip exists in the database', () => {
    for (const r of ['', 'มังสวิรัติ', 'ฮาลาล', 'แพ้อาหารทะเล']) {
      for (const g of ['lose_weight', 'build_muscle', 'healthy_habits'] as const) {
        for (const chip of getPersonalizedMealSuggestions(r, g)) {
          expect(parseFoodInput(chip).unmatched, chip).toEqual([]);
        }
      }
    }
  });

  it('does not auto-log a longer phrase that only contains a known name', () => {
    expect(parseFoodInput('สุกี้น้ำเต้าหู้ผักรวม').items).toEqual([]);
    expect(searchFoods('ผัดหมี่ไก่').length).toBeGreaterThan(0);
  });

  it('returns unknown dishes as unmatched instead of inventing numbers', () => {
    const { items, unmatched } = parseFoodInput('เมนูที่ไม่มีอยู่จริงแน่นอน');
    expect(items).toEqual([]);
    expect(unmatched).toEqual(['เมนูที่ไม่มีอยู่จริงแน่นอน']);
  });
});

describe('exercise data (synced from Google Sheet / Compendium 2024)', () => {
  it('provides every shortcut activity with ordered MET values', () => {
    for (const [type, meta] of Object.entries(EXERCISE_CATALOG)) {
      if (type === 'custom') continue;
      expect(meta.mets.light).toBeGreaterThan(0);
      expect(meta.mets.light).toBeLessThanOrEqual(meta.mets.moderate);
      expect(meta.mets.moderate).toBeLessThanOrEqual(meta.mets.vigorous);
    }
    expect(EXERCISE_CATALOG.running.mets.moderate).toBe(9.3);
  });

  it('keeps non-shortcut activities for custom search', () => {
    expect(MET_ACTIVITIES.length).toBe(EXERCISE_DATA.filter((r) => !r.shortcut).length);
    expect(MET_ACTIVITIES.find((a) => a.id === 'tennis')?.mets.moderate).toBe(6.8);
  });
});
