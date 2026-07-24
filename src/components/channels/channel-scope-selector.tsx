"use client"

import { useTranslations } from "next-intl"

import { ALL_CHANNEL_TYPES, normalizeChannelTypes } from "@/lib/channels/channel-scope"
import type { ChannelType } from "@/types"
import { cn } from "@/lib/utils"

interface ChannelScopeSelectorProps {
  value: ChannelType[] | null | undefined
  onChange: (value: ChannelType[]) => void
  compact?: boolean
}

export function ChannelScopeSelector({ value, onChange, compact }: ChannelScopeSelectorProps) {
  const t = useTranslations("Channels")
  const selected = normalizeChannelTypes(value)
  const isAll = selected.length === ALL_CHANNEL_TYPES.length

  function toggle(channel: ChannelType) {
    if (selected.includes(channel)) {
      if (selected.length === 1) return
      onChange(selected.filter((item) => item !== channel))
      return
    }
    onChange(normalizeChannelTypes([...selected, channel]))
  }

  // Compact mode: inline pills
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">{t("scope.label")}:</span>
        {ALL_CHANNEL_TYPES.map((channel) => {
          const active = selected.includes(channel)
          return (
            <button
              key={channel}
              type="button"
              onClick={() => toggle(channel)}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors border",
                active
                  ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground",
              )}
              aria-label={t(`type.${channel}`)}
              title={t(`type.${channel}`)}
            >
              <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/40")} />
              {t(`type.${channel}`)}
            </button>
          )
        })}
      </div>
    )
  }

  // Full mode: section with title
  return (
    <section className="w-full rounded-lg border border-border bg-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{t("scope.label")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("scope.help")}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ALL_CHANNEL_TYPES.map((channel) => (
          <label
            key={channel}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={selected.includes(channel)}
              onChange={() => toggle(channel)}
              className="h-4 w-4 accent-primary"
              aria-label={t(`type.${channel}`)}
            />
            {t(`type.${channel}`)}
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {isAll ? t("scope.all") : t("scope.selected", { count: selected.length })}
      </p>
    </section>
  )
}
