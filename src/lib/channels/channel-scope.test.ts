import { describe, expect, it } from "vitest"

import {
  ALL_CHANNEL_TYPES,
  channelScopeMatches,
  normalizeChannelTypes,
  validateChannelTypes,
} from "./channel-scope"

describe("channel scope normalization", () => {
  it("keeps the canonical five-channel order", () => {
    expect(ALL_CHANNEL_TYPES).toEqual([
      "whatsapp",
      "web",
      "telegram",
      "instagram",
      "facebook",
    ])
  })

  it("normalizes duplicates and arbitrary input order", () => {
    expect(normalizeChannelTypes(["facebook", "whatsapp", "facebook", "web"])).toEqual([
      "whatsapp",
      "web",
      "facebook",
    ])
  })

  it("treats legacy null, missing, and empty scopes as all channels", () => {
    expect(normalizeChannelTypes(undefined)).toEqual([...ALL_CHANNEL_TYPES])
    expect(normalizeChannelTypes(null)).toEqual([...ALL_CHANNEL_TYPES])
    expect(normalizeChannelTypes([])).toEqual([...ALL_CHANNEL_TYPES])
    expect(channelScopeMatches(null, "instagram")).toBe(true)
    expect(channelScopeMatches([], "telegram")).toBe(true)
    expect(channelScopeMatches(undefined, "web")).toBe(true)
  })

  it("validates the allowlist while accepting explicit selections", () => {
    expect(validateChannelTypes(["telegram", "telegram"])).toEqual({
      ok: true,
      channel_types: ["telegram"],
    })
    expect(validateChannelTypes(["sms"])).toMatchObject({ ok: false })
    expect(validateChannelTypes("whatsapp")).toMatchObject({ ok: false })
  })
})
