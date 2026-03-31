import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { OrderWithItems } from '@/types'

export const getDisplayQuantity = (qty: number, unit?: string) => {
    const normalizedUnit = unit?.toLowerCase() || ''
    if (normalizedUnit === 'st' || normalizedUnit === 'stuk' || normalizedUnit === 'blok') {
        return Math.round(qty)
    }
    return qty
}

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.setAttribute('crossOrigin', 'anonymous')
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx?.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = (error) => reject(error)
        img.src = url
    })
}

export async function generateOrderPDF(order: OrderWithItems) {
    const doc = new jsPDF()
    const today = new Date().toLocaleDateString('nl-NL')
    const orderDate = new Date(order.created_at).toLocaleDateString('nl-NL')

    try {
        const imgData = await getBase64ImageFromURL('/logo.png')
        doc.addImage(imgData, 'PNG', 15, 10, 40, 20)
    } catch {
        doc.setFontSize(18)
        doc.setTextColor(44, 62, 80)
        doc.text('TOP ZUIVEL', 15, 20)
    }

    doc.setFontSize(20)
    doc.setTextColor(44, 62, 80)
    doc.text('Order Overzicht', 70, 25)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Klant: ${order.company_name || 'Onbekend'}`, 15, 45)
    doc.text(`Email: ${order.email}`, 15, 52)
    doc.text(`Besteldatum: ${orderDate}`, 15, 59)
    doc.text(`Order #: ${order.order_number}`, 15, 66)

    let tableStartY = 75

    if (order.notes) {
        const notesY = 73
        const splitNotes = doc.splitTextToSize(order.notes, 170)
        const notesBlockHeight = 8 + splitNotes.length * 5

        doc.setFillColor(255, 249, 219)
        doc.setDrawColor(204, 122, 0)
        doc.setLineWidth(0.8)
        doc.rect(13, notesY - 4, 184, notesBlockHeight, 'FD')

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(153, 77, 0)
        doc.text('OPMERKING:', 15, notesY + 1)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(51, 26, 0)
        doc.text(splitNotes, 15, notesY + 7)

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        tableStartY = notesY + notesBlockHeight + 4
    }

    const sortedItems = [...order.order_items].sort(
        (a, b) => (a.products?.sort_order ?? 999) - (b.products?.sort_order ?? 999)
    )

    const tableData = sortedItems.map(item => {
        const standardWeight = item.products?.weight_per_unit || 1
        const weight = item.actual_weight ?? (item.quantity * standardWeight)
        const displayQty = getDisplayQuantity(item.quantity, item.products?.unit_label)
        return [
            item.products?.name || 'Onbekend product',
            `${displayQty} ${item.products?.unit_label || 'st'}`,
            `${weight.toFixed(3)} kg`
        ]
    })

    autoTable(doc, {
        startY: tableStartY,
        head: [['Product', 'Aantal', 'Gewicht']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 9 }
    })

    const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    doc.setFont('helvetica', 'bold')
    doc.text(`Totaal aantal regels: ${order.order_items.length}`, 15, lastY)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('Top Zuivel - Vers van de boerderij', 15, 285)

    doc.save(`${order.order_number}.pdf`)
}
