import { describe, expect, it, beforeEach, vi } from "vitest"

const h = vi.hoisted(() => ({
  source: {
    id: "source-flow",
    account_id: "account-1",
    name: "Welcome",
    description: "Source description",
    trigger_type: "keyword",
    trigger_config: { keywords: ["hello"] },
    entry_node_id: "start",
    fallback_policy: { mode: "end" },
    channel_types: ["instagram"],
    source_template_slug: "welcome",
    source_template_version: "1.0.0",
    source_template_schema_version: 1,
  },
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "send", account_id: "foreign-account" },
      position_x: 10,
      position_y: 20,
    },
  ],
  flowInserts: [] as Record<string, unknown>[],
  nodeInserts: [] as Record<string, unknown>[],
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({ body, init }),
  },
}))
vi.mock("@/lib/auth/account", () => ({
  requireRole: vi.fn(),
  toErrorResponse: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))
vi.mock("@/lib/flows/templates", () => ({
  getFlowTemplate: vi.fn(),
}))
vi.mock("@/lib/flows/admin-client", () => ({
  supabaseAdmin: vi.fn(),
}))

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/account"
import { supabaseAdmin } from "@/lib/flows/admin-client"
import { POST } from "./route"

function clientForProfile() {
  const profileQuery = {
    select: () => profileQuery,
    eq: () => profileQuery,
    single: vi.fn().mockResolvedValue({ data: { account_id: "account-1" } }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: vi.fn(() => profileQuery),
  }
}

function adminForClone() {
  return {
    from: vi.fn((table: string) => {
      const filters: Record<string, unknown> = {}
      const query: Record<string, unknown> = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters[key] = value
          return query
        },
        order: () => query,
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === "flows") {
            return {
              data: filters.account_id === h.source.account_id ? h.source : null,
              error: null,
            }
          }
          return { data: null, error: null }
        }),
        insert: vi.fn((payload: unknown) => {
          if (table === "flows") h.flowInserts.push(payload as Record<string, unknown>)
          else if (table === "flow_nodes") {
            h.nodeInserts.push(...(payload as Record<string, unknown>[]))
          }
          return query
        }),
        single: vi.fn().mockResolvedValue({ data: { ...h.source, id: "copy-flow", status: "draft" }, error: null }),
        delete: () => query,
      }
      if (table === "flow_nodes") {
        query.then = (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: h.nodes, error: null }).then(resolve)
      }
      return query
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  h.flowInserts = []
  h.nodeInserts = []
  vi.mocked(requireRole).mockResolvedValue({} as never)
  vi.mocked(createClient).mockResolvedValue(clientForProfile() as never)
  vi.mocked(supabaseAdmin).mockReturnValue(adminForClone() as never)
})

describe("POST /api/flows source clone", () => {
  it("creates a same-account draft snapshot and preserves account resources", async () => {
    const response = await POST(
      new Request("http://localhost/api/flows", {
        method: "POST",
        body: JSON.stringify({ source_flow_id: h.source.id }),
      }),
    )

    expect((response as unknown as { init?: ResponseInit }).init?.status).toBe(201)
    expect(h.flowInserts[0]).toMatchObject({
      account_id: "account-1",
      status: "draft",
      channel_types: ["instagram"],
      source_flow_id: "source-flow",
      execution_count: 0,
      last_executed_at: null,
    })
    expect(h.nodeInserts).toEqual([
      {
        flow_id: "copy-flow",
        node_key: "start",
        node_type: "start",
        config: { next_node_key: "send", account_id: "foreign-account" },
        position_x: 10,
        position_y: 20,
      },
    ])
  })

  it("does not clone a source flow from another account", async () => {
    const originalAccount = h.source.account_id
    h.source.account_id = "other-account"
    const response = await POST(
      new Request("http://localhost/api/flows", {
        method: "POST",
        body: JSON.stringify({ source_flow_id: h.source.id }),
      }),
    )

    expect((response as unknown as { init?: ResponseInit }).init?.status).toBe(404)
    expect(h.flowInserts).toHaveLength(0)
    h.source.account_id = originalAccount
  })
})
