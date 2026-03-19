import { Separator } from "@/components/ui/separator"
import { MotionSkeleton } from "@/components/MotionSkeleton"

export function ProductDetailSkeleton() {
    return (
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <MotionSkeleton className="aspect-square w-full rounded-xl" />

            <div className="space-y-6">
                <div className="space-y-3">
                    <MotionSkeleton className="h-8 w-3/4" />
                    <MotionSkeleton className="h-9 w-32" />
                </div>

                <MotionSkeleton className="h-5 w-24 rounded-full" />

                <div className="space-y-2">
                    <MotionSkeleton className="h-4 w-full" />
                    <MotionSkeleton className="h-4 w-full" />
                    <MotionSkeleton className="h-4 w-2/3" />
                </div>

                <Separator />

                <div className="space-y-4">
                    <MotionSkeleton className="h-10 w-36" />
                    <MotionSkeleton className="h-11 w-48" />
                </div>
            </div>
        </div>
    )
}