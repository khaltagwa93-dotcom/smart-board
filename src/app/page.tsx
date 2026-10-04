"use client";

import { useRef, useState, useEffect, useCallback } from "react";

type Tool =
  | "pen"
  | "eraser"
  | "line"
  | "rect"
  | "circle"
  | "arrow"
  | "text"
  | "sticky"
  | "laser"
  | "select";

type BgMode = "white" | "grid" | "lines" | "dark";

interface Point {
  x: number;
  y: number;
}

interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

const COLORS = [
  "#0f172a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];

const STICKY_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe"];

const EMOJIS = [
  "⭐", "🔥", "💡", "✅", "❌", "❓", "📌", "🎯", "📚", "✏️",
  "🧮", "🔬", "🌍", "❤️", "👍", "👏", "🎉", "🚀", "⚡", "🌟",
];

const MATH_SYMBOLS = [
  "π", "√", "∞", "∑", "∫", "≈", "≠", "≤", "≥", "±",
  "×", "÷", "α", "β", "θ", "Δ", "²", "³", "°", "∠",
];

export default function SmartBoardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#0f172a");
  const [size, setSize] = useState(4);
  const [bgMode, setBgMode] = useState<BgMode>("white");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [stickies, setStickies] = useState<StickyNote[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [laserPos, setLaserPos] = useState<Point | null>(null);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSnapshots, setPageSnapshots] = useState<(string | null)[]>([null]);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        drawBackground(ctx, rect.width, rect.height);
        if (historyStep >= 0 && history[historyStep]) {
          ctx.putImageData(history[historyStep], 0, 0);
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [bgMode]);

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (bgMode === "dark") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }

    if (bgMode === "grid") {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (bgMode === "lines") {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (let y = 40; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(data);
    if (newHistory.length > 40) newHistory.shift();
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [history, historyStep]);

  const undo = () => {
    if (historyStep <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const step = historyStep - 1;
    ctx.putImageData(history[step], 0, 0);
    setHistoryStep(step);
  };

  const redo = () => {
    if (historyStep >= history.length - 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const step = historyStep + 1;
    ctx.putImageData(history[step], 0, 0);
    setHistoryStep(step);
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    drawBackground(ctx, rect.width, rect.height);
    setStickies([]);
    saveHistory();
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);

    if (tool === "laser") {
      setLaserPos(pos);
      return;
    }

    if (tool === "text") {
      setTextInput({ x: pos.x, y: pos.y, value: "" });
      return;
    }

    if (tool === "sticky") {
      const id = Date.now().toString();
      setStickies((prev) => [
        ...prev,
        {
          id,
          x: pos.x,
          y: pos.y,
          text: "ملاحظة...",
          color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
        },
      ]);
      return;
    }

    setIsDrawing(true);
    setStartPoint(pos);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = tool === "eraser" ? size * 4 : size;
    ctx.strokeStyle = tool === "eraser" ? (bgMode === "dark" ? "#0f172a" : "#ffffff") : color;
    ctx.fillStyle = color;

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);

    if (tool === "laser") {
      setLaserPos(pos);
      return;
    }

    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      if (historyStep >= 0 && history[historyStep]) {
        ctx.putImageData(history[historyStep], 0, 0);
      } else {
        const rect = canvas.getBoundingClientRect();
        drawBackground(ctx, rect.width, rect.height);
      }

      ctx.lineWidth = size;
      ctx.strokeStyle = color;
      ctx.fillStyle = color + "33";

      if (tool === "line" || tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if (tool === "arrow") {
          const angle = Math.atan2(pos.y - startPoint.y, pos.x - startPoint.x);
          const headLen = 15 + size;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(
            pos.x - headLen * Math.cos(angle - Math.PI / 6),
            pos.y - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            pos.x - headLen * Math.cos(angle + Math.PI / 6),
            pos.y - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      } else if (tool === "rect") {
        const w = pos.x - startPoint.x;
        const h = pos.y - startPoint.y;
        ctx.strokeRect(startPoint.x, startPoint.y, w, h);
      } else if (tool === "circle") {
        const radius = Math.sqrt(
          Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const endDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (tool === "laser") {
      setLaserPos(null);
      return;
    }
    if (isDrawing) {
      setIsDrawing(false);
      setStartPoint(null);
      saveHistory();
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `smartboard-page-${currentPage + 1}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const addEmoji = (emoji: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.font = "48px serif";
    ctx.fillText(emoji, rect.width / 2 - 20, rect.height / 2);
    saveHistory();
    setShowStickers(false);
  };

  const addMath = (symbol: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.font = "36px Arial";
    ctx.fillStyle = color;
    ctx.fillText(symbol, rect.width / 2 - 10, rect.height / 2);
    saveHistory();
    setShowMath(false);
  };

  const commitText = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.font = `${16 + size * 2}px Cairo, Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = "right";
    ctx.fillText(textInput.value, textInput.x, textInput.y);
    setTextInput(null);
    saveHistory();
  };

  const addPage = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const data = canvas.toDataURL();
      const newSnapshots = [...pageSnapshots];
      newSnapshots[currentPage] = data;
      setPageSnapshots([...newSnapshots, null]);
    }
    setPages(pages + 1);
    setCurrentPage(pages);
    setTimeout(clearBoard, 50);
  };

  const goToPage = (idx: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const data = canvas.toDataURL();
    const newSnapshots = [...pageSnapshots];
    newSnapshots[currentPage] = data;
    setPageSnapshots(newSnapshots);

    setCurrentPage(idx);
    const snap = newSnapshots[idx];
    if (snap) {
      const img = new Image();
      img.onload = () => {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground(ctx, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = snap;
    } else {
      const rect = canvas.getBoundingClientRect();
      drawBackground(ctx, rect.width, rect.height);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const ToolButton = ({
    t,
    icon,
    label,
  }: {
    t: Tool;
    icon: string;
    label: string;
  }) => (
    <button
      onClick={() => setTool(t)}
      title={label}
      className={`tool-btn flex flex-col items-center justify-center w-12 h-12 rounded-xl text-lg transition ${
        tool === t
          ? "bg-indigo-600 text-white active"
          : "bg-slate-700 text-slate-200 hover:bg-slate-600"
      }`}
    >
      <span>{icon}</span>
    </button>
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-200">
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-3 sm:px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-sm">
              SB
            </div>
            <span className="font-bold text-sm sm:text-base hidden sm:inline">
              السبورة الذكية
            </span>
          </div>
          <div className="h-6 w-px bg-slate-600" />
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => goToPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40"
            >
              ◀
            </button>
            <span className="px-2">
              صفحة {currentPage + 1} / {pages}
            </span>
            <button
              onClick={() => goToPage(Math.min(pages - 1, currentPage + 1))}
              disabled={currentPage === pages - 1}
              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40"
            >
              ▶
            </button>
            <button
              onClick={addPage}
              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 mr-1"
              title="صفحة جديدة"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            title="تراجع"
          >
            ↩ تراجع
          </button>
          <button
            onClick={redo}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            title="إعادة"
          >
            ↪ إعادة
          </button>
          <button
            onClick={clearBoard}
            className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-sm"
          >
            مسح
          </button>
          <button
            onClick={downloadImage}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm"
          >
            ⬇ حفظ
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
          >
            {isFullscreen ? "⛶ خروج" : "⛶ ملء الشاشة"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-16 sm:w-20 bg-slate-800 flex flex-col items-center py-3 gap-2 shrink-0 z-10 overflow-y-auto panel-scroll">
          <ToolButton t="pen" icon="✏️" label="قلم" />
          <ToolButton t="eraser" icon="🧹" label="ممحاة" />
          <ToolButton t="line" icon="╱" label="خط" />
          <ToolButton t="arrow" icon="➤" label="سهم" />
          <ToolButton t="rect" icon="▭" label="مستطيل" />
          <ToolButton t="circle" icon="○" label="دائرة" />
          <ToolButton t="text" icon="أ" label="نص" />
          <ToolButton t="sticky" icon="📝" label="ملاحظة" />
          <ToolButton t="laser" icon="🔴" label="ليزر" />

          <div className="w-10 h-px bg-slate-600 my-1" />

          <div className="flex flex-col items-center gap-1 px-1">
            <span className="text-[10px] text-slate-400">الحجم</span>
            <input
              type="range"
              min={1}
              max={30}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-12 accent-indigo-500"
            />
            <span className="text-[10px] text-slate-300">{size}</span>
          </div>

          <div className="w-10 h-px bg-slate-600 my-1" />

          <div className="flex flex-col gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition ${
                  color === c ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </aside>

        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full touch-none ${
              tool === "pen" || tool === "line" || tool === "rect" || tool === "circle" || tool === "arrow"
                ? "cursor-pen"
                : tool === "eraser"
                ? "cursor-eraser"
                : tool === "text"
                ? "cursor-text"
                : tool === "laser"
                ? "cursor-laser"
                : ""
            }`}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />

          {stickies.map((s) => (
            <div
              key={s.id}
              className="sticky-note absolute w-40 min-h-[100px] p-3 rounded-lg text-sm text-slate-800"
              style={{
                left: s.x,
                top: s.y,
                backgroundColor: s.color,
              }}
            >
              <textarea
                className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
                defaultValue={s.text}
                onChange={(e) => {
                  setStickies((prev) =>
                    prev.map((n) =>
                      n.id === s.id ? { ...n, text: e.target.value } : n
                    )
                  );
                }}
              />
              <button
                onClick={() => setStickies((prev) => prev.filter((n) => n.id !== s.id))}
                className="absolute top-1 left-1 text-xs opacity-50 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}

          {textInput && (
            <input
              autoFocus
              className="absolute border-2 border-indigo-500 rounded px-2 py-1 text-lg bg-white shadow-lg outline-none"
              style={{ left: textInput.x, top: textInput.y }}
              value={textInput.value}
              onChange={(e) =>
                setTextInput({ ...textInput, value: e.target.value })
              }
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") setTextInput(null);
              }}
            />
          )}

          {laserPos && tool === "laser" && (
            <div
              className="laser-dot absolute w-8 h-8 -ml-4 -mt-4"
              style={{ left: laserPos.x, top: laserPos.y }}
            />
          )}
        </div>

        <aside className="w-14 sm:w-48 bg-slate-800 text-white flex flex-col shrink-0 z-10 overflow-hidden">
          <div className="p-2 sm:p-3 space-y-3 overflow-y-auto panel-scroll flex-1">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 mb-1.5 hidden sm:block">
                الخلفية
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["white", "أبيض"],
                    ["grid", "شبكة"],
                    ["lines", "أسطر"],
                    ["dark", "داكن"],
                  ] as [BgMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setBgMode(mode)}
                    className={`text-[10px] sm:text-xs py-1.5 rounded-lg transition ${
                      bgMode === mode
                        ? "bg-indigo-600"
                        : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={() => {
                  setShowStickers(!showStickers);
                  setShowMath(false);
                }}
                className="w-full text-xs py-2 rounded-lg bg-slate-700 hover:bg-slate-600"
              >
                🎨 ملصقات
              </button>
              {showStickers && (
                <div className="mt-2 grid grid-cols-4 sm:grid-cols-5 gap-1">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => addEmoji(e)}
                      className="text-xl hover:scale-125 transition p-1"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => {
                  setShowMath(!showMath);
                  setShowStickers(false);
                }}
                className="w-full text-xs py-2 rounded-lg bg-slate-700 hover:bg-slate-600"
              >
                ∑ رموز رياضية
              </button>
              {showMath && (
                <div className="mt-2 grid grid-cols-4 sm:grid-cols-5 gap-1">
                  {MATH_SYMBOLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => addMath(s)}
                      className="text-sm sm:text-base font-mono hover:bg-slate-600 rounded p-1"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden sm:block mt-4 p-3 rounded-xl bg-indigo-900/40 border border-indigo-700/50 text-[11px] text-indigo-200 leading-relaxed">
              <p className="font-semibold mb-1">💡 نصائح سريعة</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>استخدم الليزر للتأشير أثناء الشرح</li>
                <li>أضف صفحات متعددة للدرس</li>
                <li>احفظ اللوحة كصورة في أي وقت</li>
                <li>الملاحظات اللاصقة قابلة للتحرير</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
