import { Skeleton } from "@/components/ui/skeleton"

export default function ProductSkeleton() {
    return (
        <div className="flex items-center justify-between p-4 border rounded-xl bg-card/50 backdrop-blur-sm shadow-sm gap-4 transition-all duration-200">
            <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <Skeleton className="h-5 w-16 mb-1 ml-auto" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                </div>
                <Skeleton className="h-10 w-24 rounded-full" />
            </div>
        </div>
    )
}

export function ProductGridSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-40" />
            </div>
            <div className="grid grid-cols-1 gap-3">
                {[...Array(5)].map((_, i) => (
                    <ProductSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}
