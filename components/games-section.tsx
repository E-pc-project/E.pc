'use client'

import { useState } from 'react'
import { GAMES, type Game } from '@/lib/data'
import { useAuth } from './auth-context'

function GameCard({ game }: { game: Game }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="relative group text-left w-full transition-all duration-300"
      aria-expanded={expanded}
    >
      <div
        className={`relative rounded-xl border transition-all duration-300 overflow-hidden ${
          expanded ? 'neon-border-cyan' : 'border-border hover:border-opacity-50'
        }`}
        style={{
          borderColor: expanded ? game.color : undefined,
          boxShadow: expanded ? `0 0 16px ${game.color}30, inset 0 0 16px ${game.color}08` : undefined,
          background: expanded
            ? `linear-gradient(135deg, rgba(22,22,28,0.97) 0%, ${game.color}10 100%)`
            : 'rgba(22,22,28,0.8)',
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px transition-all duration-300"
          style={{ background: expanded ? game.color : 'transparent' }}
        />

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            {/* Icon badge */}
            <span
              className="text-xs font-black px-2 py-1 rounded font-mono tracking-widest shrink-0"
              style={{
                background: `${game.color}20`,
                color: game.color,
                border: `1px solid ${game.color}40`,
                fontFamily: 'var(--font-heading)',
              }}
            >
              {game.icon}
            </span>
            {game.tag && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: game.tag === 'NEW' ? '#22c55e20' : game.tag === 'HOT' ? '#ff45c820' : '#00e0ff20',
                  color: game.tag === 'NEW' ? '#22c55e' : game.tag === 'HOT' ? '#ff45c8' : '#00e0ff',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                }}
              >
                {game.tag}
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-foreground leading-tight mb-1">
            {game.name}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">{game.genre}</p>

          <span className="text-xs text-muted-foreground">{game.players}</span>
        </div>

        {/* Expanded description */}
        {expanded && (
          <div
            className="px-4 pb-4 border-t"
            style={{ borderColor: `${game.color}20` }}
          >
            <p className="text-xs text-muted-foreground leading-relaxed mt-3">
              {game.description}
            </p>
          </div>
        )}

        {/* Corner accent */}
        <span
          className="absolute top-0 right-0 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            borderTop: `2px solid ${game.color}`,
            borderRight: `2px solid ${game.color}`,
          }}
        />
      </div>
    </button>
  )
}

interface GamesSectionProps {
  onRegisterPC: () => void
}

export function GamesSection({ onRegisterPC }: GamesSectionProps) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<string>('All')
  const genres = ['All', ...Array.from(new Set(GAMES.map((g) => g.genre)))]

  const filtered = filter === 'All' ? GAMES : GAMES.filter((g) => g.genre === filter)

  return (
    <section id="games" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-xs text-neon-cyan uppercase tracking-widest mb-2 font-mono">
            // AVAILABLE GAMES
          </p>
          <h2
            className="text-3xl sm:text-4xl font-black text-foreground mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            ТОГЛООМУУД &amp;{' '}
            <span className="neon-text-cyan">ҮНЭЛГЭЭ</span>
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Дараах тоглоомуудаас сонгоод eSports заалд захиалга өгнө үү. Үнэ нь цагаар тооцогдоно.
          </p>
        </div>
        {/* Add center button — admins only */}
        {user?.isAdmin && (
          <button
            onClick={onRegisterPC}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all duration-200 hover:bg-muted"
            style={{
              borderColor: 'rgba(0,224,255,0.35)',
              color: '#00e0ff',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.05em',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9v1h2v1H5v-1h2v-1H2a1 1 0 0 1-1-1V3zm1 0v7h12V3H2z"/>
            </svg>
            ТӨВ НЭМЭХ
          </button>
        )}
      </div>

      {/* Genre filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
              filter === g
                ? 'bg-neon-cyan text-background border-neon-cyan font-bold'
                : 'border-border text-muted-foreground hover:border-neon-cyan hover:text-neon-cyan'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Games grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Нийт{' '}
        <span className="text-neon-cyan font-bold">{GAMES.length}</span> тоглоом
        — тоглоомын дэлгэрэнгүй мэдээлэл харахын тулд дарна уу
      </p>
    </section>
  )
}
