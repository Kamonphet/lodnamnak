import React, { useState } from 'react';
import {
  Award,
  Beef,
  Camera,
  Check,
  Crown,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react';
import {
  AvatarAccessoryId,
  BadgeDifficulty,
  BadgeIconKey,
  DailyQuestItem,
  GamificationSummary,
} from '../domain/types';
import { WaterGlassTracker } from './WaterGlassTracker';

interface GamificationCardProps {
  summary: GamificationSummary;
  equippedAccessory?: AvatarAccessoryId;
  onAdjustWater: (delta: number) => void;
  onEquipAccessory: (accessoryId: AvatarAccessoryId) => void;
}

const DIFFICULTY_META: Record<
  BadgeDifficulty,
  { label: string; activeClass: string; iconBg: string }
> = {
  easy: {
    label: 'ง่าย',
    activeClass: 'glass-badge-easy',
    iconBg: 'bg-sage-100 text-sage-600',
  },
  medium: {
    label: 'กลาง',
    activeClass: 'glass-badge-medium',
    iconBg: 'bg-sky-100 text-sky-600',
  },
  hard: {
    label: 'ท้าทาย',
    activeClass: 'glass-badge-hard',
    iconBg: 'bg-peach-100 text-peach-600',
  },
  legend: {
    label: 'ตำนาน',
    activeClass: 'glass-badge-legend',
    iconBg: 'bg-sunny-100 text-sunny-600',
  },
};

function renderBadgeIcon(iconKey?: BadgeIconKey) {
  const cls = 'w-4 h-4';
  switch (iconKey) {
    case 'footprints':
      return <Footprints className={cls} />;
    case 'droplet':
      return <Droplets className={cls} />;
    case 'utensils':
      return <Utensils className={cls} />;
    case 'dumbbell':
      return <Dumbbell className={cls} />;
    case 'flame':
      return <Flame className={cls} />;
    case 'camera':
      return <Camera className={cls} />;
    case 'shield':
      return <ShieldCheck className={cls} />;
    case 'scale':
      return <Scale className={cls} />;
    case 'sparkles':
      return <Sparkles className={cls} />;
    case 'trophy':
      return <Trophy className={cls} />;
    case 'crown':
      return <Crown className={cls} />;
    case 'zap':
      return <Zap className={cls} />;
    default:
      return <Award className={cls} />;
  }
}

function renderQuestIcon(id: DailyQuestItem['id']) {
  switch (id) {
    case 'log_meal':
      return <Utensils className="w-4 h-4 text-sunny-600" />;
    case 'active_or_water':
      return <Droplets className="w-4 h-4 text-sky-600" />;
    case 'protein_goal':
      return <Beef className="w-4 h-4 text-peach-600" />;
    case 'safe_calorie':
      return <Sparkles className="w-4 h-4 text-sage-600" />;
  }
}

const AccessoryPreviewIcon: React.FC<{ id: AvatarAccessoryId }> = ({ id }) => {
  if (id === 'gold_headband') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#FEF0C7" />
        <ellipse
          cx="16"
          cy="16"
          rx="10"
          ry="4.5"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="3.2"
        />
        <polygon points="16,9 19,13 16,17 13,13" fill="#10B981" />
      </svg>
    );
  }
  if (id === 'emerald_aura') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#D3F8E6" />
        <circle
          cx="16"
          cy="16"
          r="9"
          fill="none"
          stroke="#1DB974"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
        <circle cx="16" cy="7" r="2.2" fill="#14965C" />
        <circle cx="25" cy="16" r="2.2" fill="#14965C" />
        <circle cx="7" cy="16" r="2.2" fill="#14965C" />
      </svg>
    );
  }
  if (id === 'champion_crown') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#FEF0C7" />
        <path
          d="M8 21 L10 11 L14 15 L16 9 L18 15 L22 11 L24 21 Z"
          fill="#F59E0B"
          stroke="#C87A06"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="17" r="1.8" fill="#10B981" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="#EDFCF5" />
      <circle cx="16" cy="13" r="4.5" fill="#1DB974" />
      <path d="M9 24 C9 19.5 23 19.5 23 24" fill="#1DB974" />
    </svg>
  );
};

export const GamificationCard: React.FC<GamificationCardProps> = ({
  summary,
  equippedAccessory = 'none',
  onAdjustWater,
  onEquipAccessory,
}) => {
  const [subView, setSubView] = useState<'quests' | 'rewards'>('quests');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockedBadgesCount = summary.badges.filter((b) => b.unlocked).length;
  const filteredBadges = summary.badges.filter((b) => {
    if (badgeFilter === 'unlocked') return b.unlocked;
    if (badgeFilter === 'locked') return !b.unlocked;
    return true;
  });

  return (
    <section className="rounded-3xl glass-card p-4 space-y-3.5 animate-card-rise stagger-2">
      {/* แถบระดับเลเวล & สถิติไฟต่อเนื่อง */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-xl bg-sunny-100 text-sunny-600 inline-flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink-900">
                Lv.{summary.level} · {summary.rankTitle}
              </h2>
              <span className="text-[11px] font-semibold text-ink-700 tabular-data block">
                {summary.currentLevelXp}/{summary.nextLevelXp} XP · สะสม{' '}
                {summary.totalXp.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 tabular-data">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              summary.currentStreakDays > 0
                ? 'glass-btn-warm'
                : 'glass-pill text-ink-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{summary.currentStreakDays} วัน</span>
          </span>

          <span
            title="เกราะรักษาสถิติต่อเนื่องอัตโนมัติ 1 วัน/สัปดาห์"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              summary.shieldAvailable
                ? 'glass-subtle-active text-sage-900'
                : 'glass-pill text-ink-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
            <span>{summary.shieldAvailable ? 'เกราะ x1' : 'ใช้เกราะแล้ว'}</span>
          </span>
        </div>
      </div>

      {/* หลอด XP ไล่เฉดสีสดใส */}
      <div className="w-full h-2.5 rounded-full bg-white/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sage-500 to-sky-500 transition-all duration-500 ease-out"
          style={{ width: `${summary.levelProgressPct}%` }}
        />
      </div>

      {/* ตารางเช็กอิน 7 วันล่าสุด */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {summary.weekDots.map((dot) => (
          <div
            key={dot.dateKey}
            className={`rounded-2xl py-1.5 px-1 flex flex-col items-center gap-1 ${
              dot.active
                ? 'glass-subtle-active'
                : dot.isToday
                ? 'glass-pill'
                : 'glass-subtle'
            }`}
          >
            <span className="text-[10px] font-bold text-ink-700">
              {dot.dayShort}
            </span>
            <span
              className={`w-5 h-5 rounded-full inline-flex items-center justify-center ${
                dot.active
                  ? 'bg-sage-500 text-white'
                  : dot.shielded
                  ? 'bg-peach-100 text-peach-600'
                  : 'bg-white/75 text-ink-500'
              }`}
            >
              {dot.active ? (
                <Check className="w-3 h-3 animate-confirm-pop" />
              ) : dot.shielded ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-ink-300" />
              )}
            </span>
          </div>
        ))}
      </div>

      {/* ปุ่มสลับมุมมองย่อย: ภารกิจวันนี้ vs รางวัล 3D & เหรียญ */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl glass-subtle p-1">
        <button
          type="button"
          onClick={() => setSubView('quests')}
          className={`tactile-btn rounded-xl py-2 px-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 tabular-data ${
            subView === 'quests' ? 'glass-btn-primary' : 'text-ink-700'
          }`}
        >
          <span>
            ภารกิจวันนี้ ({summary.todayCompletedQuests}/{summary.totalDailyQuests})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubView('rewards')}
          className={`tactile-btn rounded-xl py-2 px-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 tabular-data ${
            subView === 'rewards' ? 'glass-btn-primary' : 'text-ink-700'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>
            รางวัล & เหรียญ ({unlockedBadgesCount}/{summary.badges.length})
          </span>
        </button>
      </div>

      {subView === 'quests' ? (
        <div className="space-y-2.5 animate-list-item">
          <WaterGlassTracker
            currentGlasses={summary.todayWaterGlasses}
            targetGlasses={summary.targetWaterGlasses}
            onAdjustWater={onAdjustWater}
          />

          {/* ภารกิจรายวัน */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-ink-900">รายการภารกิจ</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] tabular-data ${
                  summary.allQuestsCompletedToday
                    ? 'glass-subtle-active text-sage-900'
                    : 'text-ink-700'
                }`}
              >
                {summary.allQuestsCompletedToday
                  ? 'ครบทุกข้อ +20 XP'
                  : 'โบนัสครบ +20 XP'}
              </span>
            </div>

            {summary.quests.map((q) => (
              <div
                key={q.id}
                className={`rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2 ${
                  q.completed ? 'glass-subtle-active' : 'glass-subtle'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-xl shrink-0 inline-flex items-center justify-center ${
                      q.completed
                        ? 'bg-sage-500 text-white'
                        : 'bg-white/85 text-ink-700'
                    }`}
                  >
                    {q.completed ? (
                      <Check className="w-4 h-4 animate-confirm-pop" />
                    ) : (
                      renderQuestIcon(q.id)
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-ink-900 block truncate">
                      {q.title}
                    </span>
                    <span className="text-[11px] font-medium text-ink-700 tabular-data">
                      {q.progressLabel}
                    </span>
                  </div>
                </div>

                <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-bold text-sage-700 shrink-0 tabular-data">
                  +{q.xpReward} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-list-item">
          {/* ไอเทมรางวัลแต่งหุ่น 3D */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-900">
              <Crown className="w-3.5 h-3.5 text-sunny-600" />
              <span>ไอเทมรางวัลหุ่น 3D</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {summary.accessories.map((item) => {
                const isEquipped = equippedAccessory === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.unlocked}
                    onClick={() => onEquipAccessory(item.id)}
                    className={`tactile-btn rounded-2xl p-2 text-left flex items-center justify-between gap-2 disabled:opacity-55 ${
                      isEquipped
                        ? 'glass-subtle-active text-sage-900'
                        : 'glass-pill text-ink-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AccessoryPreviewIcon id={item.id} />
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-ink-700 block truncate tabular-data">
                          {item.unlocked
                            ? isEquipped
                              ? 'สวมใส่อยู่'
                              : 'ปลดล็อกแล้ว'
                            : item.unlockRequirementText}
                        </span>
                      </div>
                    </div>
                    {item.unlocked ? (
                      isEquipped ? (
                        <Check className="w-3.5 h-3.5 text-sage-600 shrink-0 animate-confirm-pop" />
                      ) : null
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-ink-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* เหรียญความสำเร็จ 18 เหรียญ (ง่าย / กลาง / ท้าทาย / ตำนาน) */}
          <div className="space-y-2 pt-2 border-t border-white/70">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-900 tabular-data">
                <Award className="w-3.5 h-3.5 text-sage-600" />
                <span>
                  เหรียญความสำเร็จ ({unlockedBadgesCount}/{summary.badges.length})
                </span>
              </span>

              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'unlocked', label: 'ได้แล้ว' },
                    { id: 'locked', label: 'กำลังล่า' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBadgeFilter(f.id)}
                    className={`tactile-btn rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      badgeFilter === f.id
                        ? 'glass-btn-primary'
                        : 'glass-pill text-ink-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 max-h-[276px] overflow-y-auto pr-0.5">
              {filteredBadges.map((badge) => {
                const diff = badge.difficulty ?? 'easy';
                const diffMeta = DIFFICULTY_META[diff];
                return (
                  <div
                    key={badge.id}
                    className={`rounded-2xl p-2 text-center flex flex-col items-center gap-1 ${
                      badge.unlocked
                        ? diffMeta.activeClass
                        : 'glass-subtle opacity-65'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between px-0.5">
                      <span className="text-[9px] font-bold text-ink-700">
                        {diffMeta.label}
                      </span>
                      {badge.unlocked ? (
                        <Check className="w-3 h-3 text-sage-600 animate-confirm-pop" />
                      ) : (
                        <Lock className="w-2.5 h-2.5 text-ink-500" />
                      )}
                    </div>

                    <span
                      className={`w-8 h-8 rounded-2xl inline-flex items-center justify-center ${
                        badge.unlocked
                          ? diffMeta.iconBg
                          : 'bg-white/75 text-ink-500'
                      }`}
                    >
                      {renderBadgeIcon(badge.iconKey)}
                    </span>

                    <span className="text-[11px] font-bold text-ink-900 block truncate w-full">
                      {badge.title}
                    </span>
                    <span className="text-[10px] font-semibold text-sage-700 block tabular-data truncate w-full">
                      {badge.progressText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
