'use client'
import React from 'react'
import { cn } from '@/lib/utils'
const DAYS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
const STATUS_COLORS: Record<string, string> = { pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30', confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', cancelled: 'bg-red-500/20 text-red-400 border-red-500/30', completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
interface Props { bookings: any[]; today: Date; openEdit: (b: any) => void }
export function WeekView({ bookings, today, openEdit }: Props) {
  const weekDays: Date[] = []
  const d = new Date(); d.setDate(d.getDate() - d.getDay())
  for (let i = 0; i < 7; i++) { const day = new Date(d); day.setDate(d.getDate() + i); weekDays.push(day) }
  return React.createElement('div', { className: 'grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden' },
    DAYS.map(d => React.createElement('div', { key: d, className: 'bg-muted/50 px-2 py-2 text-xs font-medium text-muted-foreground text-center' }, d)),
    weekDays.map(day => {
      const ds = day.toDateString()
      const isToday = ds === today.toDateString()
      const dayBookings = bookings.filter((b: any) => new Date(b.start_time).toDateString() === ds)
      return React.createElement('div', { key: day.getTime(), className: cn(isToday ? 'bg-primary/5' : 'bg-card', 'min-h-[120px] p-1 border-t border-border/50') },
        React.createElement('span', { className: cn('inline-flex h-5 w-5 items-center justify-center rounded-full text-xs', isToday && 'bg-primary text-primary-foreground font-bold') }, day.getDate()),
        React.createElement('div', { className: 'mt-1 space-y-0.5' },
          dayBookings.slice(0, 2).map(b =>
            React.createElement('div', { key: b.id, onClick: () => openEdit(b), className: cn('rounded px-1 py-0.5 text-[10px] truncate cursor-pointer hover:opacity-80', STATUS_COLORS[b.status] || 'bg-muted text-muted-foreground'), title: b.title },
              new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + b.title
            )
          ),
          dayBookings.length > 2 ? React.createElement('p', { className: 'text-[10px] text-muted-foreground px-1', key: 'more' }, '+' + (dayBookings.length - 2)) : null
        )
      )
    })
  )
}
