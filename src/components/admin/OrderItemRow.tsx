'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Scale, Save, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderItemRowProps {
    item: any
    isCompleted: boolean
    isItemCompleted: boolean
    isWeightAdjustable: boolean
    editData: any
    saving: boolean
    hasChanged: boolean
    onToggleCompletion: () => void
    onWeightChange: (val: string) => void
    onSaveWeight: () => void
    onResetWeight: () => void
    onCancelEdit: () => void
    onInitEditing: () => void
    formatPrice: (price: number) => string
}

export default function OrderItemRow({
    item,
    isCompleted,
    isItemCompleted,
    isWeightAdjustable,
    editData,
    saving,
    hasChanged,
    onToggleCompletion,
    onWeightChange,
    onSaveWeight,
    onResetWeight,
    onCancelEdit,
    onInitEditing,
    formatPrice
}: OrderItemRowProps) {
    const isCheese = item.products?.category === 'Kaas'
    const standardWeight = item.products?.weight_per_unit || 1
    const displayQty = Math.round(item.quantity) // Simplified for pieces
    const initialWeight = item.actual_weight ?? (item.quantity * standardWeight)
    const totalWeight = editData ? editData.totalWeight : initialWeight
    const unitLabel = item.products?.unit_label

    const rowTotalPrice = item.products?.is_price_per_kilo
        ? (totalWeight * item.price_snapshot)
        : (standardWeight > 0 && ['st', 'stuk', 'blok'].includes(unitLabel?.toLowerCase() || ''))
            ? (totalWeight * (item.price_snapshot / standardWeight))
            : (displayQty * item.price_snapshot)

    return (
        <tr className={cn(
            "transition-all duration-300",
            isItemCompleted ? "bg-green-100/40 hover:bg-green-100/60" : "hover:bg-muted/10"
        )}>
            <td className="py-4 px-4 text-center">
                {!isCompleted && (
                    <button
                        onClick={onToggleCompletion}
                        className={cn(
                            "transition-colors",
                            isItemCompleted ? "text-green-600" : "text-muted-foreground hover:text-primary"
                        )}
                        title={isItemCompleted ? "Markeer als niet gereed" : "Markeer als gereed"}
                    >
                        <CheckCircle2 className={cn("h-5 w-5", isItemCompleted && "fill-green-600/10")} />
                    </button>
                )}
            </td>
            <td className={cn(
                "py-4 px-4 font-medium transition-all",
                isItemCompleted && "text-green-900/60 line-through decoration-green-600/50 decoration-2"
            )}>
                {item.products?.name}
                {isCheese && (
                    <Badge variant="outline" className="ml-2 text-[10px] text-blue-600 border-blue-200 bg-blue-50">Kaas</Badge>
                )}
            </td>
            <td className="py-4 px-4 text-center">
                <div className="flex flex-col items-center">
                    <span className="font-semibold text-base">{displayQty} {unitLabel}</span>
                    <span className="text-[10px] text-muted-foreground">{formatPrice(item.price_snapshot)} / {unitLabel}</span>
                    {isCheese && (
                        <div className="flex flex-col mt-2 gap-1 w-full max-w-[140px]">
                            <span className="text-[10px] text-muted-foreground bg-muted/50 p-1 rounded border border-border/50">
                                Standaard Totaal: {Number((item.quantity * standardWeight).toFixed(3))} kg
                            </span>
                            {typeof item.actual_weight === 'number' && (
                                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 p-1 rounded flex items-center gap-1 justify-center border border-blue-100 shadow-sm">
                                    <Scale className="h-2.5 w-2.5" /> Aangepast Totaal: {Number(item.actual_weight.toFixed(3))}kg
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </td>

            <td className="py-4 px-4 text-right">
                <div className="flex flex-col items-end gap-2">
                    {isWeightAdjustable ? (
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                <div className="relative group">
                                    <Scale className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={editData?.displayTotalWeight ?? Number(initialWeight.toFixed(3)).toString()}
                                        onChange={(e) => {
                                            onInitEditing()
                                            onWeightChange(e.target.value)
                                        }}
                                        className={cn(
                                            "w-32 h-10 pl-8 text-right font-bold text-lg border-2",
                                            hasChanged ? "border-orange-500 focus:ring-orange-500" : item.actual_weight !== null ? "border-blue-400 bg-blue-50/30" : "border-input"
                                        )}
                                    />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground uppercase">kg Totaal</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {hasChanged && (
                                    <span className="text-[10px] text-orange-600 font-bold">
                                        Verschil: {(((totalWeight / initialWeight) - 1) * 100).toFixed(1)}%
                                    </span>
                                )}
                                <div className="text-xs font-bold text-primary">
                                    Subtotaal: {formatPrice(rowTotalPrice)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end">
                            <span className="text-muted-foreground text-xs italic">{isCompleted || isItemCompleted ? 'Vastgezet' : 'Niet aanpasbaar'}</span>
                            <div className="text-xs font-bold text-muted-foreground">
                                Subtotaal: {formatPrice(rowTotalPrice)}
                            </div>
                        </div>
                    )}
                </div>
            </td>
            <td className="py-4 px-4 text-right">
                {!isCompleted && isWeightAdjustable && (
                    <div className="flex flex-col gap-1">
                        <Button
                            size="sm"
                            className="h-8 w-full gap-1"
                            disabled={!editData || saving || !hasChanged}
                            onClick={onSaveWeight}
                        >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Opslaan
                        </Button>
                        {hasChanged && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-muted-foreground hover:text-destructive w-full"
                                onClick={onCancelEdit}
                            >
                                <RotateCcw className="h-3 w-3 mr-1" /> Anuleren
                            </Button>
                        )}
                        {item.actual_weight !== null && !hasChanged && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onResetWeight}
                                className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full"
                                title="Herstellen naar standaard productgewicht"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span className="text-[10px] ml-1">Reset</span>
                            </Button>
                        )}
                    </div>
                )}
            </td>
        </tr>
    )
}
