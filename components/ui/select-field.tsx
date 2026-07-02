'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Option {
  value: string
  label: string
}

interface SelectFieldProps {
  value: string
  onChange: (value: string) => void
  options: (string | Option)[]
  placeholder?: string
  className: string
  accent?: string
}

/**
 * Custom-rendered dropdown that stands in for native <select>/<option>.
 * Native select popups are OS-drawn on Windows and largely ignore page CSS
 * (background-color on <option> doesn't reliably apply there), so this
 * renders its own list — matching the app's dark theme everywhere, not
 * just in browsers/OSes that happen to honor the native styling.
 */
export function SelectField({
  value,
  onChange,
  options,
  placeholder = 'Сонгох...',
  className,
  accent = '#00e0ff',
}: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const normalized: Option[] = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const selected = normalized.find((o) => o.value === value)

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setRect({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen((v) => !v)
  }

  // Close on scroll/resize/Escape rather than tracking the trigger's
  // position continuously — simplest way to never render stale/detached.
  useEffect(() => {
    if (!open) return
    function close() {
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={className}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left', cursor: 'pointer' }}
      >
        <span className="truncate" style={!selected ? { color: 'rgba(240,242,245,0.4)' } : undefined}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{ flexShrink: 0, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
        >
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && rect && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
              <div
                className="fixed z-[101] rounded-lg py-1 overflow-y-auto"
                style={{
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  maxHeight: 240,
                  background: '#16161c',
                  border: `1px solid ${accent}40`,
                  boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 20px ${accent}15`,
                }}
              >
                {normalized.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/[0.06]"
                    style={{
                      color: o.value === value ? accent : '#f0f2f5',
                      background: o.value === value ? `${accent}15` : 'transparent',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
