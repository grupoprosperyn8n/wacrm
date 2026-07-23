"use client"

import { useTranslations } from "next-intl"

import { ALL_CHANNEL_TYPES, normalizeChannelTypes } from "@/lib/channels/channel-scope"
import type { ChannelType } from "@/types"

interface ChannelScopeSelectorProps {
  value: ChannelType[] | null | undefined
  onChange: (value: ChannelType[]) => void
}

export function ChannelScopeSelector({ value, onChange }: ChannelScopeSelectorProps) {
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
