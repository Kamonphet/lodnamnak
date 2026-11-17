import { useEffect, useRef, useState } from 'react';

/** ผู้ใช้ขอให้ลดการเคลื่อนไหว (จากหน้าตั้งค่าของแอป หรือจากระบบของเครื่อง) */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  if (document.documentElement.classList.contains('reduce-motion')) return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** ตัวเลขวิ่งจากค่าเดิมไปค่าใหม่ (ครั้งแรกวิ่งจาก 0) */
export function useCountUp(target: number, durationMs = 450, decimals = 0): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target || prefersReducedMotion()) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const factor = 10 ** decimals;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round((from + (target - from) * eased) * factor) / factor;
      fromRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, decimals]);

  return value;
}
