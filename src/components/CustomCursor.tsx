"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
  hovering: boolean;
  text: boolean;
}

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const cursor = useRef<CursorState>({
    x: -100,
    y: -100,
    visible: false,
    clicking: false,
    hovering: false,
    text: false,
  });
  const ring = useRef({ x: -100, y: -100 });
  const trails = useRef(
    Array.from({ length: 5 }, () => ({ x: -100, y: -100 }))
  );
  const rafId = useRef<number>(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const setTrailRef = useCallback(
    (el: HTMLDivElement | null, i: number) => {
      if (el) trailRefs.current[i] = el;
    },
    []
  );

  useEffect(() => {
    // Detect touch-only devices — hide custom cursor there
    const isTouch =
      "ontouchstart" in window && navigator.maxTouchPoints > 0 && !window.matchMedia("(pointer: fine)").matches;
    setIsTouchDevice(isTouch);
    if (isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      cursor.current.x = e.clientX;
      cursor.current.y = e.clientY;
      if (!cursor.current.visible) cursor.current.visible = true;
    };

    const handleMouseDown = () => {
      cursor.current.clicking = true;
    };
    const handleMouseUp = () => {
      cursor.current.clicking = false;
    };

    const handleMouseEnter = () => {
      cursor.current.visible = true;
    };
    const handleMouseLeave = () => {
      cursor.current.visible = false;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const interactive = target.closest(
        "a, button, [role='button'], select, label[for], input[type='submit'], input[type='button'], .cursor-pointer"
      );
      const textInput = target.closest(
        "input:not([type='submit']):not([type='button']):not([type='checkbox']):not([type='radio']), textarea, [contenteditable='true']"
      );

      cursor.current.hovering = !!interactive;
      cursor.current.text = !!textInput;
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseover", handleMouseOver, { passive: true });

    // Animation loop — lightweight tweening
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      const { x, y, visible, clicking, hovering, text } = cursor.current;

      // Dot follows instantly
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${x}px, ${y}px) scale(${clicking ? 0.6 : hovering ? 1.5 : 1})`;
        dotRef.current.style.opacity = visible ? "1" : "0";
      }

      // Ring follows with easing
      ring.current.x = lerp(ring.current.x, x, 0.15);
      ring.current.y = lerp(ring.current.y, y, 0.15);

      if (ringRef.current) {
        const ringScale = clicking ? 0.7 : hovering ? 1.6 : 1;
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) scale(${ringScale})`;
        ringRef.current.style.opacity = visible ? "1" : "0";
        ringRef.current.style.borderColor = hovering
          ? "var(--accent)"
          : "var(--cursor-ring-color, rgba(0, 212, 255, 0.35))";
        ringRef.current.style.boxShadow = hovering
          ? "0 0 16px var(--accent-glow), 0 0 4px var(--accent-glow)"
          : "0 0 8px var(--cursor-ring-glow, rgba(0, 212, 255, 0.12))";
      }

      // Trails: follow each other with progressive delay
      for (let i = 0; i < trails.current.length; i++) {
        const target = i === 0 ? { x, y } : trails.current[i - 1];
        const speed = 0.2 - i * 0.025;
        trails.current[i].x = lerp(trails.current[i].x, target.x, speed);
        trails.current[i].y = lerp(trails.current[i].y, target.y, speed);

        const el = trailRefs.current[i];
        if (el) {
          el.style.transform = `translate(${trails.current[i].x}px, ${trails.current[i].y}px)`;
          el.style.opacity = visible ? `${0.35 - i * 0.06}` : "0";
        }
      }

      // Text cursor override
      if (dotRef.current) {
        dotRef.current.dataset.text = text ? "true" : "false";
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId.current);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  if (isTouchDevice) return null;

  return (
    <>
      {/* Global style: hide default cursor everywhere except text inputs & Monaco */}
      <style jsx global>{`
        *, *::before, *::after {
          cursor: none !important;
        }
        /* Restore text cursor inside Monaco and actual text inputs */
        .monaco-editor,
        .monaco-editor *,
        input,
        textarea,
        [contenteditable="true"] {
          cursor: auto !important;
        }

        .custom-cursor-dot,
        .custom-cursor-ring,
        .custom-cursor-trail {
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 99999;
          will-change: transform, opacity;
        }

        .custom-cursor-dot {
          width: 8px;
          height: 8px;
          margin-left: -4px;
          margin-top: -4px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow), 0 0 4px var(--accent);
          transition: transform 0.08s ease, background 0.2s ease;
        }

        .custom-cursor-dot[data-text="true"] {
          width: 3px;
          height: 22px;
          margin-left: -1.5px;
          margin-top: -11px;
          border-radius: 2px;
          background: var(--accent);
          animation: cursor-text-blink 1s step-end infinite;
        }

        @keyframes cursor-text-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }

        .custom-cursor-ring {
          width: 36px;
          height: 36px;
          margin-left: -18px;
          margin-top: -18px;
          border-radius: 50%;
          border: 1.5px solid rgba(0, 212, 255, 0.35);
          background: transparent;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.2s ease,
                      box-shadow 0.2s ease;
        }

        .custom-cursor-trail {
          width: 4px;
          height: 4px;
          margin-left: -2px;
          margin-top: -2px;
          border-radius: 50%;
          background: var(--accent);
        }
      `}</style>

      {/* Trail dots */}
      {trails.current.map((_, i) => (
        <div
          key={`trail-${i}`}
          ref={(el) => setTrailRef(el, i)}
          className="custom-cursor-trail"
        />
      ))}

      {/* Ring (outer circle) */}
      <div ref={ringRef} className="custom-cursor-ring" />

      {/* Dot (center) */}
      <div ref={dotRef} className="custom-cursor-dot" />
    </>
  );
}
