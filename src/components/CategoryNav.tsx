'use client'

import { Button } from './ui/button'

interface CategoryNavProps {
    categories: string[]
    onCategoryClick: (category: string) => void
}

export default function CategoryNav({ categories, onCategoryClick }: CategoryNavProps) {
    return (
        <div className="sticky top-16 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
            {categories.map(category => (
                <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    onClick={() => onCategoryClick(category)}
                    className="rounded-full text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                    {category}
                </Button>
            ))}
        </div>
    )
}
