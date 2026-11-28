import { useEffect, useRef } from "react";

export const WHEEL_ROW = 44; // px per row
const VISIBLE = 5; // rows shown; the middle one is the choice

// A scroll wheel like the phone's own time picker: scroll (it snaps to a row), tap a row,
// or use the arrow keys. The row in the middle band is the value.
export function Wheel({ values, value, onChange, label, format = String }) {
  const ref = useRef(null);
  const settle = useRef(null);
  const latest = useRef(value); // the value the wheel last reported, for the scroll timer
  const shown = useRef(false);
  const index = Math.max(0, values.indexOf(value));

  useEffect(() => {
    latest.current = value;
  }, [value]);

  const choose = (i) => {
    const next = values[Math.min(values.length - 1, Math.max(0, i))];
    if (next === latest.current) return;
    latest.current = next;
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.(); // a light tick, like a real wheel
    onChange(next);
  };

  // Keep the value in the middle: jump there when the wheel opens, glide after a tap or key press
  useEffect(() => {
    const el = ref.current;
    const top = index * WHEEL_ROW;
    if (!el || Math.abs(el.scrollTop - top) < 2) return;
    if (shown.current && el.scrollTo) el.scrollTo({ top, behavior: "smooth" });
    else el.scrollTop = top;
  }, [index]);

  useEffect(() => {
    shown.current = true;
    return () => clearTimeout(settle.current);
  }, []);

  // Once the scrolling stops (and has snapped), the row in the middle is chosen
  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (ref.current) choose(Math.round(ref.current.scrollTop / WHEEL_ROW));
    }, 120);
  };

  const onKeyDown = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
    if (step) choose(index + step);
    else if (e.key === "Home") choose(0);
    else if (e.key === "End") choose(values.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={typeof value === "number" ? value : undefined}
      aria-valuetext={format(value)}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      style={{ height: WHEEL_ROW * VISIBLE }}
      className="relative snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-xl outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-sky-500 [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]"
    >
      {/* Blank rows above and below, so the first and last values can reach the middle */}
      <div style={{ height: WHEEL_ROW * 2 }} aria-hidden="true" />
      {values.map((v, i) => (
        <div
          key={v}
          onClick={() => choose(i)}
          aria-hidden="true"
          style={{ height: WHEEL_ROW }}
          className={`flex snap-center items-center justify-center tabular-nums transition-colors ${
            i === index ? "text-2xl font-bold text-slate-900" : "text-xl font-medium text-slate-400"
          }`}
        >
          {format(v)}
        </div>
      ))}
      <div style={{ height: WHEEL_ROW * 2 }} aria-hidden="true" />
    </div>
  );
}
