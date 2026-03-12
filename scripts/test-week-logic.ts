
import { getCustomWeekData } from '../src/lib/date-utils'

const dates = [
    { name: 'Monday Morning', date: new Date('2026-03-09T09:00:00Z') }, // Monday 10:00 NL
    { name: 'Thursday Night', date: new Date('2026-03-12T20:00:00Z') }, // Thursday 21:00 NL
    { name: 'Sunday Morning', date: new Date('2026-03-15T09:00:00Z') }, // Sunday 10:00 NL
    { name: 'Sunday Night Late', date: new Date('2026-03-15T22:30:00Z') }, // Sunday 23:30 NL
    { name: 'Monday Very Early', date: new Date('2026-03-16T00:30:00Z') }, // Monday 01:30 NL
]

dates.forEach(d => {
    const weekData = getCustomWeekData(d.date)
    console.log(`${d.name.padEnd(20)} | Date: ${d.date.toISOString()} | NL Time: ${d.date.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })} | Week: ${weekData.weekNumber} | Year: ${weekData.year}`)
})

console.log('\nVerification of Sunday belonging to "that week":')
const sundayNight = getCustomWeekData(new Date('2026-03-15T22:30:00Z'))
const precedingMonday = getCustomWeekData(new Date('2026-03-09T09:00:00Z'))
if (sundayNight.weekNumber === precedingMonday.weekNumber) {
    console.log('✅ Sunday evening belongs to the preceding week (Correct for Top Zuivel business week)')
} else {
    console.log('❌ Sunday evening belongs to a different week')
}
