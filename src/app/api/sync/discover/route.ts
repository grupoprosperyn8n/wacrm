import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { discoverResources } from '@/lib/sync/engine'
import type { ConnectorType } from '@/lib/sync/types'

export async function POST(request: Request) {
  try {
    await getCurrentAccount()
    const body = await request.json()
    const result = await discoverResources(
      body.connectorType as ConnectorType,
      body.config || {},
      body.resourceType || undefined
    )
    return NextResponse.json(result)
  } catch (err) { return toErrorResponse(err) }
}
