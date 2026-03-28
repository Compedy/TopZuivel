
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
    // Top Zuivel wants Sunday orders to stay in the current business week.
    // In NL (UTC+1/2), Sunday 23:30 is Monday 00:30 UTC.
    // We should use the local NL time to determine the week.

    // Convert UTC date to NL time (Europe/Amsterdam)
    const nlDateStr = date.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' });
    const nlDate = new Date(nlDateStr);

    // Standard ISO week logic for the NL date
    const weekNumber = getISOWeek(nlDate);

    // Start of week (Monday 00:00 NL time)
    const temp = new Date(nlDate);
    const day = temp.getDay() || 7; // 1-7 (Mon-Sun)
    temp.setDate(temp.getDate() - day + 1);
    temp.setHours(0, 0, 0, 0);

    const weekStart = new Date(temp);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);

    return {
        weekNumber,
        weekStart,
        weekEnd,
        display: `Week ${weekNumber} (${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)})`,
        year: nlDate.getFullYear()
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

/**
 * Returns the next Wednesday after the given date.
 * If the date falls on a Wednesday, returns the following Wednesday (7 days later).
 * Uses Europe/Amsterdam timezone for day-of-week calculation.
 */
export function getDeliveryDate(orderDate: Date): Date {
    const nlDateStr = orderDate.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })
    const nlDate = new Date(nlDateStr)

    const dayOfWeek = nlDate.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const daysUntilWed = dayOfWeek === 3 ? 7 : (3 - dayOfWeek + 7) % 7

    const delivery = new Date(nlDate)
    delivery.setDate(nlDate.getDate() + daysUntilWed)
    return delivery
}

import { OrderWithItems } from '@/types'

/**
 * Groups orders by their custom week.
 */
export function groupOrdersByWeek(orders: OrderWithItems[]) {
    const groups: Record<string, { weekData: WeekData, orders: OrderWithItems[] }> = {};

    orders.forEach(order => {
        // Since orders are now associated with delivery week (n+1)
        // We shift the creation date 7 days forward to get the correct weekData for grouping
        const date = new Date(order.created_at);
        const deliveryDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
        const weekData = getCustomWeekData(deliveryDate);
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
