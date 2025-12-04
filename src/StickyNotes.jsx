// StickyNote.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Pin } from "lucide-react";

/**
 * StickyNote
 * Props:
 *  - userId: string (from HabitTracker)
 *  - isLoggedIn: boolean (from HabitTracker)
 *  - corner: "bottom-right" | "top-right" | "bottom-left" | "top-left"
 *
 * Persists note and position per user in localStorage under:
 *  - ld_sticky_note_<userKey>
 *  - ld_sticky_note_pos_<userKey>
 *
 * Uses palette provided by user.
 */

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export default function StickyNote({
  userId = null,
  isLoggedIn = false,
  corner = "bottom-right",
  colors = DEFAULT_COLORS
}) {
  const storageUserKey = isLoggedIn && userId ? String(userId) : "anonymous";
  const noteKey = `ld_sticky_note_${storageUserKey}`;
  const posKey = `ld_sticky_note_pos_${storageUserKey}`;
  const styleKey = `ld_sticky_note_style_${storageUserKey}`;

  const noteRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sheetColor, setSheetColor] = useState(colors[0]);
  const [textColor, setTextColor] = useState("black");

  const [pos, setPos] = useState(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [isHover, setIsHover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pulseActive, setPulseActive] = useState(true);

  // --- load note & style & pos per user ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(noteKey);
      if (raw != null) setText(raw);
    } catch (e) { /* ignore */ }

    try {
      const rawStyle = localStorage.getItem(styleKey);
      if (rawStyle) {
        const parsed = JSON.parse(rawStyle);
        if (parsed.sheetColor) setSheetColor(parsed.sheetColor);
        if (parsed.textColor) setTextColor(parsed.textColor);
      }
    } catch (e) { /* ignore */ }

    try {
      const rawPos = localStorage.getItem(posKey);
      if (rawPos) {
        const parsed = JSON.parse(rawPos);
        if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
        }
      }
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey, posKey, styleKey, storageUserKey]);

  // persist text per user
  useEffect(() => {
    try {
      localStorage.setItem(noteKey, text);
    } catch (e) {}
  }, [text, noteKey]);

  // persist style per user
  useEffect(() => {
    try {
      localStorage.setItem(styleKey, JSON.stringify({ sheetColor, textColor }));
    } catch (e) {}
  }, [sheetColor, textColor, styleKey]);

  // persist position per user
  const persistPos = (p) => {
    try {
      localStorage.setItem(posKey, JSON.stringify(p));
    } catch (e) {}
  };

  // compute corner coords if no saved pos
  const cornerOffset = 40;
  const buttonSize = 56;
  const BUTTON_SIZE = 56; // size of the sticky-note button (matches CSS)

  const computeCornerPos = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  switch (corner) {
    case "top-left":
      return { x: cornerOffset, y: cornerOffset };

    case "top-right":
      return { x: w - BUTTON_SIZE - cornerOffset, y: cornerOffset };

    case "bottom-left":
      return { x: cornerOffset, y: h - BUTTON_SIZE - cornerOffset };

    case "bottom-right":
    default:
      // Lift the note slightly higher to avoid UI collisions
      return { x: w - BUTTON_SIZE - cornerOffset, y: h - BUTTON_SIZE - (cornerOffset + 30) };
  }
};


  // Drag handlers (mouse + touch)
  const onPointerDown = (e) => {
    if (e.type === "mousedown" && e.button !== 0) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const base = pos || computeCornerPos();
    offsetRef.current = { x: clientX - base.x, y: clientY - base.y };
    draggingRef.current = true;
    setIsDragging(true);
    setIsHover(true);

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - offsetRef.current.x;
    const y = clientY - offsetRef.current.y;

    const maxX = window.innerWidth - buttonSize - 8;
    const maxY = window.innerHeight - buttonSize - 8;
    const nx = Math.max(8, Math.min(maxX, x));
    const ny = Math.max(8, Math.min(maxY, y));

    setPos({ x: nx, y: ny });
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    setIsHover(false);
    if (pos) persistPos(pos);

    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", onPointerUp);
    window.removeEventListener("touchmove", onPointerMove);
    window.removeEventListener("touchend", onPointerUp);
  };

  // stop pulse when opened or dragged
  useEffect(() => {
    if (open || isDragging) setPulseActive(false);
  }, [open, isDragging]);

  // escape to close
  useEffect(() => {
    const onKey = (ev) => { if (ev.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // click: open only when not dragging
  const onClickHandle = () => {
    if (isDragging) return;
    setOpen(true);
    setPulseActive(false);
  };

  const clearNote = () => {
    setText("");
    try { localStorage.removeItem(noteKey); } catch (e) {}
  };

  const currentPos = pos || (typeof window !== "undefined" ? computeCornerPos() : { x: 0, y: 0 });
  const buttonStyle = {
    position: "fixed",
    left: currentPos.x,
    top: currentPos.y,
    width: buttonSize,
    height: buttonSize,
    zIndex: 9999,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  // small readable contrasting text color helper (if you want dynamic text color suggestion)
  const readableTextForBg = (bg) => {
    // simple luminance check
    try {
      const c = bg.replace("#", "");
      const r = parseInt(c.substring(0,2),16);
      const g = parseInt(c.substring(2,4),16);
      const b = parseInt(c.substring(4,6),16);
      const lum = (0.299*r + 0.587*g + 0.114*b)/255;
      return lum > 0.6 ? "#111827" : "#f8fafc";
    } catch (e) {
      return "#111827";
    }
  };

  return (
    <>
      {/* Floating paper button */}
      <div
        ref={noteRef}
        style={buttonStyle}
        onMouseDown={onPointerDown}
        onTouchStart={onPointerDown}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => { if (!isDragging) setIsHover(false); }}
        onClick={onClickHandle}
        role="button"
        aria-label="Open sticky note"
        className="select-none"
      >
        {/* subtle attention ring / pulse */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{
            boxShadow: isDragging || isHover ? "0 10px 30px rgba(0,0,0,0.18)" : "0 6px 18px rgba(0,0,0,0.12)",
            borderRadius: 6,
            outline: isDragging || isHover ? `2px solid rgba(99,102,241,0.12)` : undefined,
            animation: pulseActive && !isHover && !isDragging ? "stickyPulse 1800ms infinite" : "none",
boxShadow: pulseActive ? "0 0 16px rgba(99,102,241,0.28)" : undefined,

          }}
        />

        {/* pin icon */}
        <div style={{ position: "absolute", right: -6, top: -6, zIndex: 4 }}>
          <Pin className="w-5 h-5 text-gray-800" />
        </div>

        {/* paper visual: uses sheetColor */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: sheetColor,
            border: "1px solid rgba(0,0,0,0.25)",
            borderRadius: 6,
            transform: isDragging ? "rotate(-1deg) scale(1.02)" : "rotate(-1deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isDragging || isHover ? "0 10px 30px rgba(0,0,0,0.18)" : "0 6px 14px rgba(0,0,0,0.12)",
            transition: "box-shadow 180ms, transform 120ms",
            overflow: "hidden",
            color: textColor
          }}
        >
          {/* small teaser lines (paper lines) */}
          <div style={{ width: "70%", height: "60%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, marginBottom: 6 }} />
            <div style={{ height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, marginBottom: 6, width: "80%" }} />
            <div style={{ height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, width: "60%" }} />
          </div>
        </div>
      </div>

      {/* overlay modal */}
      {open && (
        <div className="fixed inset-0 z-[1080] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 z-[1090]" style={{ minHeight: 360 }}>
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div style={{ width: 38, height: 38 }} className="rounded-sm bg-white border border-gray-200 flex items-center justify-center">
                  <Pin className="w-4 h-4 text-gray-800" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Pinned Note</div>
                  <div className="text-xs text-gray-500">Saved locally for {isLoggedIn && userId ? userId : "this browser"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearNote}
                  className="text-xs px-3 py-1 rounded bg-gray-50 border border-gray-100 hover:bg-gray-100 transition"
                >
                  Clear
                </button>

                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded hover:bg-gray-100 transition"
                  aria-label="Close notes"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>

            {/* content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center">
                <div className="md:col-span-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write quick notes — reminders, shopping list, ideas..."
                    className="w-full min-h-[180px] resize-y rounded-md p-4 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm"
                    style={{
                      background: `repeating-linear-gradient(transparent, transparent 24px, rgba(0,0,0,0.02) 24px)`,
                      lineHeight: 1.45,
                      color: textColor,
                    }}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Sheet color</div>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(c => (
                        <button
                          key={c}
                          onClick={() => setSheetColor(c)}
                          className={`w-8 h-8 rounded-md border-2 ${sheetColor === c ? 'ring-2 ring-indigo-300 scale-105' : 'border-transparent'}`}
                          style={{ background: c }}
                          aria-label={`Set sheet color ${c}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-2">Text color</div>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(c => (
                        <button
                          key={`t-${c}`}
                          onClick={() => setTextColor(c)}
                          className={`w-8 h-8 rounded-md border-2 ${textColor === c ? 'ring-2 ring-indigo-300 scale-105' : 'border-transparent'}`}
                          style={{ background: c }}
                          aria-label={`Set text color ${c}`}
                        />
                      ))}
                      {/* quick auto option */}
                      <button
                        onClick={() => setTextColor(readableTextForBg(sheetColor))}
                        className="w-8 h-8 rounded-md border-2 border-gray-200 flex items-center justify-center text-xs text-gray-700"
                        title="Auto choose readable color"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">Tip: drag the paper to move it — position is remembered per user.</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => { setOpen(false); }}
                  className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* pulse keyframes */}
      <style>{`
        @keyframes stickyPulse {
          0% { box-shadow: 0 6px 18px rgba(99,102,241,0.06); transform: scale(1) rotate(-1deg); }
          50% { box-shadow: 0 14px 36px rgba(99,102,241,0.10); transform: scale(1.03) rotate(-1.2deg); }
          100% { box-shadow: 0 6px 18px rgba(99,102,241,0.06); transform: scale(1) rotate(-1deg); }
        }
      `}</style>
    </>
  );
}
