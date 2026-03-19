import { MotionSkeleton } from "@/components/MotionSkeleton"

export function ProductCardSkeleton() {
    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <MotionSkeleton className="aspect-square w-full rounded-none" />

            <div className="p-4 space-y-3">
                <MotionSkeleton className="h-5 w-3/4" />
                <MotionSkeleton className="h-4 w-full" />
                <MotionSkeleton className="h-4 w-1/2" />

                <div className="flex items-center justify-between pt-2">
                    <MotionSkeleton className="h-6 w-20" />
                    <MotionSkeleton className="h-5 w-16 rounded-full" />
                </div>
            </div>
        </div>
    )
}