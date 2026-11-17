import React from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Download,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  BOTTOM_STYLES,
  CLOTH_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  TOP_STYLES,
} from '../domain/avatarOptions';
import { Avatar3DScene, resolveLook } from './Avatar3DScene';
import { THAI_WEEKDAYS, WATER_GLASS_OPTIONS } from '../domain/appSettings';
import { AppSettings, AvatarCustomization, UserProfile } from '../domain/types';

declare const __APP_VERSION__: string;

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  settings: AppSettings;
  accountsCount: number;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onUpdateAvatar: (patch: Partial<AvatarCustomization>) => void;
  onEditProfile: () => void;
  onManageAccounts: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteProfile: () => void;
}

/** กลุ่มตั้งค่า: หัวข้อเล็กเหนือการ์ด แถวในการ์ดคั่นด้วยเส้นบาง */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-1.5">
    <h3 className="px-1 text-sm font-semibold text-ink-500">{title}</h3>
    <div className="rounded-3xl glass-card px-4 py-1 divide-y divide-line">{children}</div>
  </section>
);

function Swatches({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { hex: string; label: string }[];
  value: string;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-ink-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((c) => {
          const active = value.toLowerCase() === c.hex;
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onPick(c.hex)}
              aria-label={`${label} ${c.label}`}
              aria-pressed={active}
              className={`w-7 h-7 rounded-full border-2 border-white shadow transition-transform ${
                active ? 'scale-110 ring-2 ring-ink-900 ring-offset-1' : ''
              }`}
              style={{ backgroundColor: c.hex }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Chips<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: string;
  onPick: (id: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-ink-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            aria-pressed={value === o.id}
            className={`tactile-btn h-8 px-2.5 rounded-full text-xs font-semibold ${
              value === o.id ? 'glass-btn-primary' : 'glass-pill text-ink-900'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type LookTab = 'skin' | 'hair' | 'top' | 'bottom';
const LOOK_TABS: { id: LookTab; label: string }[] = [
  { id: 'skin', label: 'ผิว' },
  { id: 'hair', label: 'ผม' },
  { id: 'top', label: 'เสื้อ' },
  { id: 'bottom', label: 'ล่าง' },
];

/** ตัวละครอยู่ซ้าย ตัวเลือกอยู่ขวา แยกเป็นหมวด เห็นผลทันทีโดยไม่ต้องเลื่อน */
function CharacterEditor({
  profile,
  lowPower,
  onUpdateAvatar,
}: {
  profile: UserProfile;
  lowPower: boolean;
  onUpdateAvatar: (patch: Partial<AvatarCustomization>) => void;
}) {
  const [tab, setTab] = React.useState<LookTab>('hair');
  const look = resolveLook(profile.gender, profile.avatarStyle);
  return (
    <div className="py-3 grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-2.5 items-start">
      <div className="sticky top-0 rounded-2xl bg-cream-100 overflow-hidden">
        <Avatar3DScene
          compact
          gender={profile.gender}
          age={profile.age}
          heightCm={profile.heightCm}
          currentWeightKg={profile.currentWeightKg}
          targetWeightKg={profile.targetWeightKg}
          primaryGoal={profile.primaryGoal}
          avatarStyle={profile.avatarStyle}
          expression="curious"
          lowPower={lowPower}
        />
      </div>
      <div className="min-w-0 space-y-2.5">
        <div role="tablist" aria-label="ปรับแต่งตัวละคร" className="grid grid-cols-4 gap-1 p-1 rounded-full bg-ink-900/5">
          {LOOK_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`h-8 rounded-full text-xs font-bold transition-colors ${
                tab === t.id ? 'bg-cream-50 text-ink-900 shadow-[0_1px_2px_rgba(42,34,27,0.12)]' : 'text-ink-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="space-y-3 max-h-[290px] overflow-y-auto pr-0.5">
          {tab === 'skin' && (
            <Swatches label="สีผิว" options={SKIN_TONES} value={look.skinTone} onPick={(hex) => onUpdateAvatar({ skinTone: hex })} />
          )}
          {tab === 'hair' && (
            <>
              <Chips
                label="ชาย"
                options={HAIR_STYLES.filter((h) => h.group === 'boy')}
                value={look.hairStyle}
                onPick={(id) => onUpdateAvatar({ hairStyle: id })}
              />
              <Chips
                label="หญิง"
                options={HAIR_STYLES.filter((h) => h.group === 'girl')}
                value={look.hairStyle}
                onPick={(id) => onUpdateAvatar({ hairStyle: id })}
              />
              <Swatches label="สีผม" options={HAIR_COLORS} value={look.hairColor} onPick={(hex) => onUpdateAvatar({ hairColor: hex })} />
            </>
          )}
          {tab === 'top' && (
            <>
              <Chips label="แบบ" options={TOP_STYLES} value={look.top} onPick={(id) => onUpdateAvatar({ top: id })} />
              <Swatches label="สี" options={CLOTH_COLORS} value={look.topColor} onPick={(hex) => onUpdateAvatar({ shirtColor: hex })} />
            </>
          )}
          {tab === 'bottom' && (
            <>
              <Chips label="แบบ" options={BOTTOM_STYLES} value={look.bottom} onPick={(id) => onUpdateAvatar({ bottom: id })} />
              <Swatches label="สี" options={CLOTH_COLORS} value={look.bottomColor} onPick={(hex) => onUpdateAvatar({ bottomColor: hex })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="py-2.5 flex items-center justify-between gap-3 min-h-[48px]">
    <span className="text-sm text-ink-900">{label}</span>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-7 rounded-full transition-colors ${checked ? 'bg-sage-600' : 'bg-ink-300/60'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-cream-50 shadow-[0_1px_3px_rgba(42,34,27,0.25)] transition-transform ${
        checked ? 'translate-x-5' : ''
      }`}
    />
  </button>
);

const LinkRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full py-2.5 min-h-[48px] flex items-center gap-2.5 text-sm text-left ${
      danger ? 'text-berry-600 font-semibold' : 'text-ink-900'
    }`}
  >
    <span className={danger ? 'text-berry-600' : 'text-ink-500'}>{icon}</span>
    <span className="flex-1">{label}</span>
    {!danger && <ChevronRight className="w-4 h-4 text-ink-500" />}
  </button>
);

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  open,
  onClose,
  profile,
  settings,
  accountsCount,
  onUpdateSettings,
  onUpdateAvatar,
  onEditProfile,
  onManageAccounts,
  onExport,
  onImport,
  onDeleteProfile,
}) => {
  if (!open) return null;
  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex sm:items-center sm:justify-center sm:p-3 glass-modal-backdrop animate-backdrop-in"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full h-dvh sm:h-auto sm:max-h-[92vh] sm:max-w-md app-sheet sm:rounded-3xl flex flex-col overflow-hidden"
      >
        <header
          className="px-4 pb-3 flex items-center justify-between glass-header"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <h2 id="settings-title" className="text-lg font-bold text-ink-900">
            ตั้งค่า
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดการตั้งค่า"
            className="tactile-btn w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-700 hover:bg-cream-200"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div
          className="flex-1 overflow-y-auto px-4 pt-4 space-y-5"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Section title="ตัวละคร">
            <CharacterEditor profile={profile} lowPower={settings.lowPower3d} onUpdateAvatar={onUpdateAvatar} />
          </Section>

          <Section title="การแจ้งเตือน">
            <Row label="ชั่งน้ำหนักประจำสัปดาห์">
              <Toggle
                label="เตือนชั่งน้ำหนัก"
                checked={settings.weighInReminder}
                onChange={(v) => onUpdateSettings({ weighInReminder: v })}
              />
            </Row>
            {settings.weighInReminder && (
              <div className="py-2.5 space-y-2">
                <span className="text-sm text-ink-900">วันชั่งน้ำหนัก</span>
                <div className="flex flex-wrap gap-1.5">
                  {[-1, 0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onUpdateSettings({ weighInWeekday: d })}
                      aria-pressed={settings.weighInWeekday === d}
                      className={`tactile-btn min-w-[40px] h-9 px-2.5 rounded-full text-xs font-bold ${
                        settings.weighInWeekday === d ? 'glass-btn-primary' : 'glass-pill text-ink-900'
                      }`}
                    >
                      {d === -1 ? 'ทุก 7 วัน' : THAI_WEEKDAYS[d]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Row label="ดื่มน้ำ">
              <Toggle
                label="เตือนดื่มน้ำ"
                checked={settings.waterReminder}
                onChange={(v) => onUpdateSettings({ waterReminder: v })}
              />
            </Row>
            <Row label="บันทึกอาหาร">
              <Toggle
                label="เตือนบันทึกอาหาร"
                checked={settings.mealReminder}
                onChange={(v) => onUpdateSettings({ mealReminder: v })}
              />
            </Row>
            <Row label="แจ้งเมื่อทำครบทุกข้อ">
              <Toggle
                label="แจ้งเมื่อทำครบทุกข้อของวัน"
                checked={settings.celebrationToasts}
                onChange={(v) => onUpdateSettings({ celebrationToasts: v })}
              />
            </Row>
          </Section>

          <Section title="โปรไฟล์และเป้าหมาย">
            <LinkRow
              icon={<UserRound className="w-4 h-4" />}
              label="ข้อมูลร่างกาย เป้าหมาย ข้อจำกัดอาหาร"
              onClick={onEditProfile}
            />
            <div className="py-2.5 space-y-2">
              <span className="text-sm text-ink-900">ขนาดแก้วน้ำ</span>
              <div className="flex flex-wrap gap-1.5">
                {WATER_GLASS_OPTIONS.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => onUpdateSettings({ waterGlassMl: ml })}
                    aria-pressed={settings.waterGlassMl === ml}
                    className={`tactile-btn h-9 px-3 rounded-full text-xs font-bold tabular-data ${
                      settings.waterGlassMl === ml ? 'glass-btn-primary' : 'glass-pill text-ink-900'
                    }`}
                  >
                    {ml} มล.
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="การแสดงผล">
            <Row label="ลดภาพเคลื่อนไหว">
              <Toggle
                label="ลดภาพเคลื่อนไหว"
                checked={settings.reduceMotion}
                onChange={(v) => onUpdateSettings({ reduceMotion: v })}
              />
            </Row>
            <Row label="ตัวอักษรใหญ่">
              <Toggle
                label="ตัวอักษรใหญ่"
                checked={settings.largeText}
                onChange={(v) => onUpdateSettings({ largeText: v })}
              />
            </Row>
            <Row label="หุ่น 3D โหมดประหยัดแบต">
              <Toggle
                label="หุ่น 3D โหมดประหยัดแบต"
                checked={settings.lowPower3d}
                onChange={(v) => onUpdateSettings({ lowPower3d: v })}
              />
            </Row>
          </Section>

          <Section title="ข้อมูลและบัญชี">
            <LinkRow
              icon={<Users className="w-4 h-4" />}
              label={`ผู้ใช้ในเครื่องนี้ (${accountsCount})`}
              onClick={onManageAccounts}
            />
            <LinkRow icon={<Download className="w-4 h-4" />} label="ส่งออกข้อมูล (JSON)" onClick={onExport} />
            <LinkRow icon={<Upload className="w-4 h-4" />} label="นำเข้าข้อมูล (JSON)" onClick={onImport} />
            <LinkRow
              icon={<Trash2 className="w-4 h-4" />}
              label="ลบโปรไฟล์นี้"
              onClick={onDeleteProfile}
              danger
            />
          </Section>

          <Section title="เกี่ยวกับ">
            <Row label="เวอร์ชัน">
              <span className="text-sm font-semibold text-ink-700 tabular-data">{version}</span>
            </Row>
            <div className="py-2.5 space-y-1 text-xs text-ink-700 leading-relaxed">
              <p>
                ข้อมูลโภชนาการอาหาร: Thai Food Composition Database (Thai FCD), สถาบันโภชนาการ
                มหาวิทยาลัยมหิดล (INMU) · inmu.mahidol.ac.th/thaifcd
              </p>
              <p>ค่าการเผาผลาญ: 2024 Adult Compendium of Physical Activities · pacompendium.com</p>
              <p>สินค้าบรรจุภัณฑ์: Open Food Facts</p>
              <p>อ่านฉลาก: OpenThai 2.0 OCR (iApp Technology, Apache-2.0)</p>
              <p>ข้อมูลในแอปเป็นค่าประมาณเพื่อดูแลสุขภาพทั่วไป ไม่ใช่คำแนะนำทางการแพทย์</p>
            </div>
          </Section>
        </div>
      </div>
    </div>,
    document.body
  );
};
