import { motion } from "framer-motion"

export function MotionSkeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden bg-muted rounded-md ${className}`}>
            <motion.div
                className="absolute inset-0"
                initial={{ x: "-150%" }}
                animate={{ x: "150%" }}
                transition={{
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "linear",
                }}
                style={{
                    background: `
                        linear-gradient(
                            90deg,
                            transparent 0%,
                            rgba(255,255,255,0.25) 40%,
                            rgba(255,255,255,0.45) 50%,
                            rgba(255,255,255,0.25) 60%,
                            transparent 100%
                        )
                    `,
                    filter: "blur(6px)",
                }}
            />
        </div>
    )
}