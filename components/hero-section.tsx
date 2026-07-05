"use client";

import { useState } from "react";
import { GAMES, type EsportsCenter } from "@/lib/data";
import { useCenters } from "@/lib/use-centers";

interface HeroSectionProps {
  onBook: (center: EsportsCenter) => void;
  onNavigate: (view: "games" | "centers") => void;
}

export function HeroSection({ onBook, onNavigate }: HeroSectionProps) {
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { centers } = useCenters();

  const totalPCs = centers.reduce((sum, c) => sum + (c.totalSeats || 0), 0);
  const STATS = [
    { value: String(centers.length), label: "eSports Заал" },
    { value: totalPCs > 0 ? String(totalPCs) : "—", label: "PC Тоног" },
    { value: String(GAMES.length), label: "Тоглоом" },
    { value: "24/7", label: "Нээлттэй" },
  ];

  const results =
    search.length > 0
      ? centers.filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.district.toLowerCase().includes(search.toLowerCase()) ||
            c.address.toLowerCase().includes(search.toLowerCase()),
        )
      : [];

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden"
    >
      {/* Hero background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/hero-bg.png)" }}
      />
      {/* Dark overlay to keep text legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(18,18,24,0.72) 0%, rgba(18,18,24,0.55) 40%, rgba(18,18,24,0.85) 80%, #0a0a0d 100%)",
        }}
      />

      {/* Subtle grid on top */}
      <div className="absolute inset-0 cyber-grid opacity-20" />

      <div className="relative z-10 max-w-4xl w-full mx-auto pt-24">
        {/* Pre-label */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-8 h-px bg-neon-cyan opacity-60" />
          <span className="text-xs text-neon-cyan uppercase tracking-[0.3em] font-mono">
            Mongolia&apos;s #1 eSports Platform
          </span>
          <span className="w-8 h-px bg-neon-cyan opacity-60" />
        </div>

        {/* 18+ / 24h notice */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest border"
            style={{
              background: "rgba(255,69,200,0.08)",
              borderColor: "rgba(255,69,200,0.35)",
              color: "#ff45c8",
              fontFamily: "var(--font-heading)",
            }}
          >
            18+
          </span>
          <span className="text-[11px] text-muted-foreground font-mono tracking-wider">
            Зөвхөн 18-аас дээш насны хүнд · 24 цаг хүртэл авах боломжтой
          </span>
        </div>

        {/* Main heading */}
        <h1
          className="text-5xl sm:text-7xl font-black leading-none mb-6 text-balance"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <span className="block text-foreground">ESPORTS</span>
          <span className="block neon-text-cyan">ЗААЛ</span>
          <span className="block text-foreground text-4xl sm:text-5xl mt-1">
            ЗАХИАЛАХ
          </span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-10">
          Улаанбаатарын шилдэг eSports заалуудыг нэг дороос хайж, захиалга өгч,
          тоглоомын туршлагаа эхлүүлэ.
        </p>

        {/* Search bar */}
        <div className="relative max-w-lg mx-auto mb-10">
          <div className="relative flex items-center">
            <svg
              className="absolute left-4 w-5 h-5 text-neon-cyan"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M11.7 10.3a6 6 0 1 0-1.4 1.4l3.3 3.3 1.4-1.4-3.3-3.3zm-5.7 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder="eSports заал хайх..."
              className="w-full pl-12 pr-4 py-4 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none transition-all duration-200 text-sm"
              style={{
                background: "rgba(22,22,28,0.9)",
                border: "1px solid rgba(0,224,255,0.3)",
                boxShadow: "0 0 20px rgba(0,224,255,0.1)",
              }}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("centers")}
            />
            <button
              onClick={() => onNavigate("centers")}
              className="absolute right-2 px-4 py-2 rounded-lg text-xs font-bold text-background transition-all duration-200"
              style={{
                background: "#00e0ff",
                fontFamily: "var(--font-heading)",
              }}
            >
              ХАЙХ
            </button>
          </div>

          {/* Search results dropdown */}
          {showResults && results.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl z-30"
              style={{
                background: "rgba(22,22,28,0.98)",
                border: "1px solid rgba(0,224,255,0.25)",
              }}
            >
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onBook(c);
                    setShowResults(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors group border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-neon-cyan transition-colors">
                      {c.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.district} — {c.address}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded shrink-0"
                    style={{
                      background: `${c.color}20`,
                      color: c.color,
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    ₮{c.priceFrom.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => onNavigate("centers")}
            className="px-8 py-4 rounded-xl font-black text-background text-sm tracking-widest neon-glow-btn transition-all duration-200"
            style={{
              background: "#00e0ff",
              fontFamily: "var(--font-heading)",
            }}
          >
            ЗААЛ ХАЙХ
          </button>
          <button
            onClick={() => onNavigate("games")}
            className="px-8 py-4 rounded-xl font-bold text-sm tracking-widest border transition-all duration-200 hover:bg-muted"
            style={{
              border: "1px solid rgba(255,69,200,0.4)",
              color: "#ff45c8",
              fontFamily: "var(--font-heading)",
            }}
          >
            ТОГЛООМУУД
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl py-4 px-3 text-center"
              style={{
                background: "rgba(22,22,28,0.7)",
                border: "1px solid rgba(0,224,255,0.12)",
              }}
            >
              <p
                className="text-2xl font-black neon-text-cyan mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="text-xs text-muted-foreground font-mono tracking-widest">
          SCROLL
        </span>
        <div className="w-px h-8 bg-neon-cyan animate-pulse" />
     
      </div>
    </section>
  );
}
