import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

export default function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', duration = 0.8 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const from = 0;
    const to = Number(value || 0);
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, inView, duration]);

  const text = decimals
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString('en-IN');

  return (
    <motion.span ref={ref} className="tabular-nums">
      {prefix}
      {text}
      {suffix}
    </motion.span>
  );
}
