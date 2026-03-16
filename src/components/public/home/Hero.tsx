import {useCallback, useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "motion/react";
import Link from "next/link";
import {ArrowRight, ChevronLeft, ChevronRight} from "lucide-react";

const CAROUSEL_SLIDES = [
    {
        id: 1,
        url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=85&auto=format&fit=crop",
        caption: "Dîner gastronomique",
        sub: "Soirée Truffe & Champagne · Paris",
    },
    {
        id: 2,
        url: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1600&q=85&auto=format&fit=crop",
        caption: "L'art du buffet",
        sub: "Cocktail dînatoire · Épinal",
    },
    {
        id: 3,
        url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=85&auto=format&fit=crop",
        caption: "Gastronomie de saison",
        sub: "Menu Printemps 2026",
    },
    {
        id: 4,
        url: "https://images.unsplash.com/photo-1530062845289-9109b2c9c868?w=1600&q=85&auto=format&fit=crop",
        caption: "Mise en place d'exception",
        sub: "Gala Annuel Maison Léonard",
    },
    {
        id: 5,
        url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1600&q=85&auto=format&fit=crop",
        caption: "Pâtisserie fine",
        sub: "Création Chef Sophie Durant",
    },
]

export function Hero() {
    const [current, setCurrent] = useState(0)
    const [direction, setDirection] = useState(1)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const go = useCallback((dir: 1 | -1) => {
        setDirection(dir)
        setCurrent((p) => (p + dir + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)
    }, [])

    // Avance auto toutes les 5s
    useEffect(() => {
        timerRef.current = setInterval(() => go(1), 5000)
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [go])

    const resetTimer = (dir: 1 | -1) => {
        if (timerRef.current) clearInterval(timerRef.current)
        go(dir)
        timerRef.current = setInterval(() => go(1), 5000)
    }

    const slide = CAROUSEL_SLIDES[current]

    const variants = {
        enter:   (d: number) => ({ x: d > 0 ? "8%"  : "-8%", opacity: 0, scale: 1.04 }),
        center:  { x: 0, opacity: 1, scale: 1 },
        exit:    (d: number) => ({ x: d > 0 ? "-8%" : "8%",  opacity: 0, scale: 0.97 }),
    }

    return (
        <section className="relative h-screen min-h-[600px] overflow-hidden bg-stone-900">

            {/* ── Image de fond animée ─────────────────────────────────────────── */}
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={slide.id}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
                    className="absolute inset-0"
                >
                    <img
                        src={slide.url}
                        alt={slide.caption}
                        className="h-full w-full object-cover"
                    />
                    {/* Gradient bas pour lisibilité du texte */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
                </motion.div>
            </AnimatePresence>

            {/* ── Texte central ────────────────────────────────────────────────── */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="mb-6 inline-flex items-center gap-3"
                >
                    <div className="h-px w-10 bg-[#C41E3A]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
            Traiteur · Épinal · Depuis 2009
          </span>
                    <div className="h-px w-10 bg-[#C41E3A]" />
                </motion.div>

                <div className="overflow-hidden">
                    <motion.h1
                        initial={{ y: "110%" }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
                        className="text-[clamp(3.2rem,9vw,7.5rem)] font-black leading-[0.9] tracking-[-0.03em] text-white"
                        style={{ fontFamily: "'Georgia', serif" }}
                    >
                        Maison <span style={{ color: "#C41E3A" }}>Léonard</span>
                    </motion.h1>
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.85 }}
                    className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-white/70"
                >
                    L'art de la table au service de vos événements. Dîners gastronomiques, cocktails, galeries — chaque moment devient exceptionnel.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.05 }}
                    className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
                >
                    <Link
                        href="/evenements"
                        className="group flex items-center gap-2.5 rounded-full bg-[#C41E3A] px-7 py-3.5 text-[14px] font-bold text-white shadow-lg transition-all hover:bg-[#A01830] hover:shadow-[0_8px_30px_rgba(196,30,58,0.4)]"
                    >
                        Découvrir les événements
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                        href="/catalogue"
                        className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-[14px] font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
                    >
                        Notre catalogue
                    </Link>
                </motion.div>
            </div>

            {/* ── Légende slide ─────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`caption-${slide.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute bottom-20 left-8 md:left-12"
                >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C41E3A]">
                        {slide.caption}
                    </p>
                    <p className="mt-0.5 text-[13px] text-white/50">{slide.sub}</p>
                </motion.div>
            </AnimatePresence>

            {/* ── Contrôles flèches ──────────────────────────────────────────────── */}
            <button
                onClick={() => resetTimer(-1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white backdrop-blur-sm transition-all hover:border-white/30 hover:bg-black/35 md:left-6 cursor-pointer"
                aria-label="Photo précédente"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <button
                onClick={() => resetTimer(1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white backdrop-blur-sm transition-all hover:border-white/30 hover:bg-black/35 md:right-6 cursor-pointer"
                aria-label="Photo suivante"
            >
                <ChevronRight className="h-5 w-5" />
            </button>

            {/* ── Pastilles de navigation ────────────────────────────────────────── */}
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2">
                {CAROUSEL_SLIDES.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
                        className={`transition-all duration-300 rounded-full ${
                            i === current
                                ? "w-7 bg-[#C41E3A] h-2"
                                : "w-2 h-2 bg-white/30 hover:bg-white/60"
                        }`}
                        aria-label={`Slide ${i + 1}`}
                    />
                ))}
            </div>

            {/* ── Barre de progression ──────────────────────────────────────────── */}
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/10">
                <motion.div
                    key={current}
                    className="h-full bg-[#C41E3A]"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                />
            </div>
        </section>
    )
}
