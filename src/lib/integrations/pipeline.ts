import type { SupabaseClient } from '@supabase/supabase-js'

const ECOMMERCE_STAGES = [
  { name: 'Interesado', color: 'bg-blue-500' },
  { name: 'Producto agregado', color: 'bg-indigo-500' },
  { name: 'Orden no pagada', color: 'bg-amber-500' },
  { name: 'Orden pagada', color: 'bg-emerald-500' },
  { name: 'Orden cancelada', color: 'bg-red-500' },
  { name: 'Orden archivada', color: 'bg-muted-foreground' },
]

export async function ensureEcommercePipeline(
  db: SupabaseClient,
  accountId: string,
): Promise<string | null> {
  // Check if ecommerce pipeline already exists
  const { data: existing } = await db
    .from('pipelines')
    .select('id')
    .eq('account_id', accountId)
    .eq('name', 'Ecommerce')
    .maybeSingle()

  if (existing) return existing.id

  // Create pipeline
  const { data: pipeline, error } = await db
    .from('pipelines')
    .insert({ account_id: accountId, name: 'Ecommerce' })
    .select('id')
    .single()

  if (error || !pipeline) {
    console.error('Error creating ecommerce pipeline:', error)
    return null
  }

  // Create stages
  const stages = ECOMMERCE_STAGES.map((s, i) => ({
    pipeline_id: pipeline.id,
    account_id: accountId,
    name: s.name,
    color: s.color,
    order: i,
  }))

  const { error: stagesErr } = await db.from('pipeline_stages').insert(stages)
  if (stagesErr) console.error('Error creating ecommerce stages:', stagesErr)

  return pipeline.id
}
