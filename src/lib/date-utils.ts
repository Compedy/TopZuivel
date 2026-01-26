
/**
 * Custom week logic for Top Zuivel.
 * A week runs from Sunday 23:00 to the next Sunday 22:59.
 * This effectively shifts the week start 1 hour earlier than the standard Monday 00:00.
 */

export interface WeekData {
    weekNumber: number
    weekStart: Date
    weekEnd: Date
    display: string
    year: number
}

export function getCustomWeekData(date: Date): WeekData {
    // Shift the date 1 hour forward to handle the 23:00 boundary
    const shiftedDate = new Date(date.getTime() + 60 * 60 * 1000);

    // Calculate ISO week number of the shifted date
    const weekNumber = getISOWeek(shiftedDate);

    // To find the start of this week:
    // 1. Find the Monday of the ISO week for the shifted date.
    // 2. Subtract 1 hour from that Monday 00:00 to get Sunday 23:00.
    const temp = new Date(shiftedDate);
    const day = temp.getUTCDay() || 7; // 1-7 (Mon-Sun)
    temp.setUTCDate(temp.getUTCDate() - day + 1);
    temp.setUTCHours(0, 0, 0, 0);

    const weekStart = new Date(temp.getTime() - 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000); // 7 days later minus 1 second

    return {
        weekNumber,
        weekStart,
        weekEnd,
        display: `Week ${weekNumber} (${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)})`,
        // Year is also important for grouping across years
        year: shiftedDate.getUTCFullYear()
    };
}

function getISOWeek(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

function formatDateShort(date: Date) {
    return date.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'short'
    });
}

import { OrderWithItems } from '@/types'

/**
 * Groups orders by their custom week.
 */
export function groupOrdersByWeek(orders: OrderWithItems[]) {
    const groups: Record<string, { weekData: WeekData, orders: OrderWithItems[] }> = {};

    orders.forEach(order => {
        const date = new Date(order.created_at);
        const weekData = getCustomWeekData(date);
        const key = `${weekData.year}-W${weekData.weekNumber}`;

        if (!groups[key]) {
            groups[key] = {
                weekData,
                orders: []
            };
        }
        groups[key].orders.push(order);
    });

    return Object.values(groups).sort((a, b) => {
        // Sort by week start descending
        return b.weekData.weekStart.getTime() - a.weekData.weekStart.getTime();
    });
}
