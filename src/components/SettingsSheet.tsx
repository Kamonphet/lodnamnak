import React from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  ChevronRight,
  Database,
  Download,
  Info,
  MonitorSmartphone,
  Palette,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { SHIRT_COLORS, SKIN_TONES } from '../domain/avatarOptions';
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

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <section className="rounded-3xl glass-card p-4 space-y-3">
    <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
      <span className="w-7 h-7 rounded-xl bg-sage-100 text-sage-600 inline-flex items-center justify-center shrink-0">
        {icon}
      </span>
      {title}
    </h3>
    <div className="divide-y divide-white/60">{children}</div>
  </section>
);

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
    className={`relative w-12 h-7 rounded-full transition-colors ${checked ? 'bg-sage-500' : 'bg-ink-900/15'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
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
    <span className={danger ? 'text-berry-600' : 'text-sage-600'}>{icon}</span>
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
  const shirt = profile.avatarStyle?.shirtColor ?? '#2e8b67';
  const skin = profile.avatarStyle?.skinTone ?? '#ffdfc8';
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
          className="px-4 pb-3 flex items-center justify-between border-b border-sand-100 bg-white/70"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <h2 id="settings-title" className="text-lg font-bold text-ink-900">
            ตั้งค่า
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดการตั้งค่า"
            className="tactile-btn w-9 h-9 rounded-full glass-pill inline-flex items-center justify-center text-ink-700"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div
          className="flex-1 overflow-y-auto p-3.5 space-y-3.5"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Section icon={<Palette className="w-4 h-4" />} title="ตัวละคร">
            <div className="py-2.5 space-y-2">
              <span className="text-sm text-ink-900">สีชุด</span>
              <div className="flex flex-wrap gap-2">
                {SHIRT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => onUpdateAvatar({ shirtColor: c.hex })}
                    aria-label={`สีชุด ${c.label}`}
                    aria-pressed={shirt === c.hex}
                    className={`w-8 h-8 rounded-full border-2 border-white shadow transition-transform ${
                      shirt === c.hex ? 'scale-110 ring-2 ring-ink-900 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
            <div className="py-2.5 space-y-2">
              <span className="text-sm text-ink-900">สีผิว</span>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map((s) => (
                  <button
                    key={s.hex}
                    type="button"
                    onClick={() => onUpdateAvatar({ skinTone: s.hex })}
                    aria-label={s.label}
                    aria-pressed={skin === s.hex}
                    className={`w-8 h-8 rounded-full border-2 border-white shadow transition-transform ${
                      skin === s.hex ? 'scale-110 ring-2 ring-ink-900 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: s.hex }}
                  />
                ))}
              </div>
            </div>
          </Section>

          <Section icon={<Bell className="w-4 h-4" />} title="การแจ้งเตือน">
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
            <Row label="ฉลองเมื่อทำภารกิจสำเร็จ">
              <Toggle
                label="ข้อความฉลองภารกิจ"
                checked={settings.celebrationToasts}
                onChange={(v) => onUpdateSettings({ celebrationToasts: v })}
              />
            </Row>
          </Section>

          <Section icon={<UserRound className="w-4 h-4" />} title="โปรไฟล์และเป้าหมาย">
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

          <Section icon={<MonitorSmartphone className="w-4 h-4" />} title="การแสดงผล">
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

          <Section icon={<Database className="w-4 h-4" />} title="ข้อมูลและบัญชี">
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

          <Section icon={<Info className="w-4 h-4" />} title="เกี่ยวกับ">
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
              <p>ข้อมูลในแอปเป็นค่าประมาณเพื่อดูแลสุขภาพทั่วไป ไม่ใช่คำแนะนำทางการแพทย์</p>
            </div>
          </Section>
        </div>
      </div>
    </div>,
    document.body
  );
};
