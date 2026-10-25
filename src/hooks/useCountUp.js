import { useState, useEffect } from 'react';
import { prefersReducedMotion } from '../three/webglUtils';

/**
 * High-performance number count-up animation hook
 * Only animates for large jumps (month switch / load), instantly updates for single increments (+1 / -1)
 */
export function useCountUp(targetNumber, duration = 400) {
  const [current, setCurrent] = useState(targetNumber);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setCurrent(targetNumber);
      return;
    }

    const diff = targetNumber - current;
    if (diff === 0) return;

    // For single item checkbox clicks (+1 or -1), update instantly with zero animation overhead
    if (Math.abs(diff) <= 1) {
      setCurrent(targetNumber);
      return;
    }

    const start = current;
    const startTime = performance.now();

    const step = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + diff * ease));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCurrent(targetNumber);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [targetNumber, duration]);

  return current;
}
