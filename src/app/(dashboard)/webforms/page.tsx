'use client'
import { WebformsPanel } from '@/components/settings/webforms-panel'

export default function WebformsPage() {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Webforms</h1><p className="text-sm text-muted-foreground mt-1">Captura leads desde tu sitio web con formularios embedidos</p></div>
      <WebformsPanel />
    </div>
  )
}
