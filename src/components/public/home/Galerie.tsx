"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface GalleryPhoto {
  id: number
  url: string
  label: string
}

const BASE_GALLERY: GalleryPhoto[] = [
  { id: 1,  url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80&auto=format&fit=crop", label: "Dîner gastronomique" },
  { id: 2,  url: "https://images.unsplash.com/photo-1555244162-803834f70033?w=900&q=80&auto=format&fit=crop",    label: "Cocktail dînatoire" },
  { id: 3,  url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80&auto=format&fit=crop", label: "Gastronomie de saison" },
  { id: 4,  url: "https://images.unsplash.com/photo-1530062845289-9109b2c9c868?w=900&q=80&auto=format&fit=crop", label: "Table d'honneur" },
  { id: 5,  url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80&auto=format&fit=crop", label: "Pâtisserie fine" },
  { id: 6,  url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=900&q=80&auto=format&fit=crop", label: "Brunch printemps" },
  { id: 7,  url: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=900&q=80&auto=format&fit=crop", label: "Champagne & célébration" },
  { id: 8,  url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900",                           label: "Cuisine raffinée" },
  { id: 9,  url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900",                              label: "Ambiance chaleureuse" },
  { id: 10, url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900",                           label: "Plats signature" },
  { id: 11, url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900",                           label: "Notre salle" },
  { id: 12, url: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=900",                           label: "Soirées privées" },
  { id: 13, url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900",                              label: "Bar à cocktails" },
]

const N               = BASE_GALLERY.length
const AUTO_DELAY      = 3000
const TRANSITION_MS   = 500
const SWIPE_THRESHOLD = 40

const ITEMS: GalleryPhoto[] = [
  ...BASE_GALLERY,
  ...BASE_GALLERY,
  ...BASE_GALLERY,
]
const START_IDX = N

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay }}
    >
      {children}
    </motion.div>
  )
}

function DecorLine({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`h-px bg-gradient-to-r from-transparent via-[#C41E3A] to-transparent ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.1, ease: "easeInOut", delay: 0.15 }}
    />
  )
}

const toHiRes = (url: string) =>
  url.includes("w=900") ? url.replace("w=900", "w=1400") : url

export function Galerie() {
  const [active,    setActive]    = useState<GalleryPhoto | null>(null)
  const [dotActive, setDotActive] = useState(0)

  const viewportRef  = useRef<HTMLDivElement>(null)
  const innerRef     = useRef<HTMLDivElement>(null)
  const absIdxRef    = useRef(START_IDX)
  const isAnimating  = useRef(false)
  const isHovered    = useRef(false)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pointeur (mouse + touch)
  const pointerDown    = useRef(false)
  const pointerMoved   = useRef(false)
  const pointerStartX  = useRef(0)
  const pointerStartTx = useRef(0)

  const getCurrentTx = (): number => {
    const inner = innerRef.current
    if (!inner) return 0
    return new DOMMatrix(getComputedStyle(inner).transform).m41
  }

  const txForIdx = useCallback((idx: number): number => {
    const vp    = viewportRef.current
    const inner = innerRef.current
    if (!vp || !inner) return 0

    const card = inner.children[idx] as HTMLElement | undefined
    if (!card) return 0

    const vpW     = vp.offsetWidth
    const cardW   = card.offsetWidth
    const cardLeft = card.offsetLeft

    return vpW / 2 - cardLeft - cardW / 2
  }, [])

  const applyTx = useCallback((tx: number, animated: boolean) => {
    const inner = innerRef.current
    if (!inner) return
    inner.style.transition = animated
      ? `transform ${TRANSITION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      : "none"
    inner.style.transform = `translateX(${tx}px)`
  }, [])

  const teleportIfNeeded = useCallback(() => {
    let idx = absIdxRef.current
    if (idx < N || idx >= 2 * N) {
      idx = ((idx % N) + N) % N + N
      absIdxRef.current = idx
      applyTx(txForIdx(idx), false)
    }
  }, [applyTx, txForIdx])

  const navigate = useCallback((delta: number) => {
    if (isAnimating.current) return
    isAnimating.current = true

    const next = absIdxRef.current + delta
    absIdxRef.current = next
    setDotActive(((next % N) + N) % N)
    applyTx(txForIdx(next), true)

    setTimeout(() => {
      teleportIfNeeded()
      isAnimating.current = false
    }, TRANSITION_MS + 20)
  }, [applyTx, txForIdx, teleportIfNeeded])

  const snapToClosest = useCallback(() => {
    const curTx  = getCurrentTx()
    const inner  = innerRef.current
    const vp     = viewportRef.current
    if (!inner || !vp) return

    const vpCenter = vp.offsetWidth / 2
    let closestIdx = absIdxRef.current
    let minDist    = Infinity

    Array.from(inner.children).forEach((child, i) => {
      const el         = child as HTMLElement
      const cardCenter = el.offsetLeft + curTx + el.offsetWidth / 2
      const dist       = Math.abs(cardCenter - vpCenter)
      if (dist < minDist) { minDist = dist; closestIdx = i }
    })

    absIdxRef.current = closestIdx
    setDotActive(((closestIdx % N) + N) % N)
    isAnimating.current = true
    applyTx(txForIdx(closestIdx), true)
    setTimeout(() => {
      teleportIfNeeded()
      isAnimating.current = false
    }, TRANSITION_MS + 20)
  }, [applyTx, txForIdx, teleportIfNeeded])

  useEffect(() => {
    const init = () => applyTx(txForIdx(START_IDX), false)
    requestAnimationFrame(init)

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => applyTx(txForIdx(absIdxRef.current), false))
    })
    if (viewportRef.current) ro.observe(viewportRef.current)
    return () => ro.disconnect()
  }, [applyTx, txForIdx])

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (!isHovered.current) navigate(1)
    }, AUTO_DELAY)
  }, [navigate])

  useEffect(() => {
    startAutoScroll()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [startAutoScroll])

  const resetTimer = useCallback((delta: number) => {
    navigate(delta)
    startAutoScroll()
  }, [navigate, startAutoScroll])

  const onPointerStart = (clientX: number) => {
    if (isAnimating.current) return
    pointerDown.current    = true
    pointerMoved.current   = false
    pointerStartX.current  = clientX
    pointerStartTx.current = getCurrentTx()
    applyTx(pointerStartTx.current, false)
  }

  const onPointerMove = (clientX: number) => {
    if (!pointerDown.current) return
    const delta = clientX - pointerStartX.current
    if (Math.abs(delta) > 4) pointerMoved.current = true
    applyTx(pointerStartTx.current + delta, false)
  }

  const onPointerEnd = (clientX: number) => {
    if (!pointerDown.current) return
    pointerDown.current = false
    const delta = clientX - pointerStartX.current

    if (!pointerMoved.current || Math.abs(delta) < 4) {
      snapToClosest()
      return
    }
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      navigate(delta < 0 ? 1 : -1)
    } else {
      snapToClosest()
    }
    startAutoScroll()
  }

  const onMouseDown  = (e: React.MouseEvent) => { isHovered.current = true; onPointerStart(e.clientX) }
  const onMouseMove  = (e: React.MouseEvent) => onPointerMove(e.clientX)
  const onMouseUp    = (e: React.MouseEvent) => onPointerEnd(e.clientX)
  const onMouseLeave = () => {
    isHovered.current = false
    if (pointerDown.current) { pointerDown.current = false; snapToClosest(); startAutoScroll() }
  }
  const onMouseEnter = () => { isHovered.current = true }

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return

    const onTouchStart  = (e: TouchEvent) => { isHovered.current = true;  onPointerStart(e.touches[0].clientX) }
    const onTouchMove   = (e: TouchEvent) => {
      if (pointerDown.current && pointerMoved.current) e.preventDefault()
      onPointerMove(e.touches[0].clientX)
    }
    const onTouchEnd    = (e: TouchEvent) => { isHovered.current = false; onPointerEnd(e.changedTouches[0].clientX) }

    inner.addEventListener("touchstart",  onTouchStart, { passive: true })
    inner.addEventListener("touchmove",   onTouchMove,  { passive: false })
    inner.addEventListener("touchend",    onTouchEnd,   { passive: true })
    inner.addEventListener("touchcancel", onTouchEnd,   { passive: true })
    return () => {
      inner.removeEventListener("touchstart",  onTouchStart)
      inner.removeEventListener("touchmove",   onTouchMove)
      inner.removeEventListener("touchend",    onTouchEnd)
      inner.removeEventListener("touchcancel", onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCardClick = (photo: GalleryPhoto) => {
    if (pointerMoved.current) return
    const original = BASE_GALLERY.find((p) => p.label === photo.label) ?? photo
    setActive(original)
  }

  const handleDotClick = (i: number) => {
    const cur = ((absIdxRef.current % N) + N) % N
    let d = i - cur
    if (d >  N / 2) d -= N
    if (d < -N / 2) d += N
    resetTimer(d)
  }

  return (
    <section className="bg-white py-24 overflow-hidden">
      <div className="mx-auto mb-10 max-w-6xl px-6">
        <div className="flex items-end justify-between">
          <div>
            <Reveal>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#C41E3A]">
                Galerie
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2
                className="text-[clamp(1.8rem,4vw,2.8rem)] font-black leading-none tracking-tight text-stone-900"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                Nos moments forts
              </h2>
            </Reveal>
          </div>
        </div>
      </div>

      <DecorLine className="mx-6 mb-10 max-w-6xl md:mx-auto" />

      <div className="relative">
        <div ref={viewportRef} className="overflow-hidden pb-4">
          <div
            ref={innerRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onMouseEnter={onMouseEnter}
            className="flex gap-4 will-change-transform select-none cursor-grab active:cursor-grabbing"
            style={{ paddingLeft: "24px", paddingRight: "24px" }}
          >
            {ITEMS.map((photo, i) => (
              <div
                key={`${photo.id}-${i}`}
                onClick={() => handleCardClick(photo)}
                className="group relative shrink-0 overflow-hidden rounded-2xl"
                style={{
                  width: "clamp(240px, 30vw, 380px)",
                  height: "clamp(280px, 35vw, 440px)",
                  cursor: "zoom-in",
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.label}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="text-[13px] font-bold text-white">{photo.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arrows on desktop only */}
        <button
          onClick={() => resetTimer(-1)}
          className="absolute left-4 top-1/2 -translate-y-[calc(50%+0.5rem)] hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md md:left-6"
          style={{ cursor: "pointer" }}
          aria-label="Photo précédente"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => resetTimer(1)}
          className="absolute right-4 top-1/2 -translate-y-[calc(50%+0.5rem)] hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md md:right-6"
          style={{ cursor: "pointer" }}
          aria-label="Photo suivante"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {BASE_GALLERY.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => handleDotClick(i)}
              aria-label={`Photo ${i + 1}`}
              style={{ cursor: "pointer" }}
              className={`transition-all duration-300 rounded-full ${
                i === dotActive
                  ? "w-7 h-2 bg-[#C41E3A]"
                  : "w-2 h-2 bg-stone-300 hover:bg-stone-500"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            style={{ cursor: "zoom-out" }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-4xl overflow-hidden rounded-2xl shadow-2xl"
              style={{ cursor: "default" }}
            >
              <img
                src={toHiRes(active.url)}
                alt={active.label}
                className="max-h-[85vh] w-auto object-contain"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-5">
                <p className="text-[14px] font-bold text-white">{active.label}</p>
              </div>
              <button
                onClick={() => setActive(null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                style={{ cursor: "pointer" }}
                aria-label="Fermer"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
