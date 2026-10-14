import { useState, useEffect, useRef } from 'react';

export function useSmoothTimer(serverSeconds: number) {
  const [smoothTime, setSmoothTime] = useState<number>(serverSeconds);
  const targetEndTimeRef = useRef<number>(Date.now() + serverSeconds * 1000);
  const initialDurationRef = useRef<number>(Math.max(1, serverSeconds));
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // When server sync arrives:
    const now = Date.now();
    const newTarget = now + serverSeconds * 1000;

    // If timer jumped up (new phase or reset), update initial duration
    if (serverSeconds > smoothTime + 1.5 || serverSeconds <= 0) {
      initialDurationRef.current = Math.max(1, serverSeconds);
    }

    targetEndTimeRef.current = newTarget;
    setSmoothTime(serverSeconds);
  }, [serverSeconds]);

  useEffect(() => {
    const update = () => {
      if (serverSeconds <= 0) {
        setSmoothTime(0);
        return;
      }

      const now = Date.now();
      const diffMs = targetEndTimeRef.current - now;
      const remaining = Math.max(0, diffMs / 1000);

      setSmoothTime(remaining);

      if (remaining > 0) {
        rafIdRef.current = requestAnimationFrame(update);
      }
    };

    rafIdRef.current = requestAnimationFrame(update);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [serverSeconds]);

  const formatted = smoothTime <= 0
    ? '0.0s'
    : smoothTime < 10
    ? `${smoothTime.toFixed(1)}s`
    : `${Math.ceil(smoothTime)}s`;

  const progressPct = Math.min(100, Math.max(0, (smoothTime / initialDurationRef.current) * 100));

  return {
    smoothTime,
    formatted,
    progressPct,
    isUrgent: smoothTime <= 5.0 && smoothTime > 0,
  };
}
