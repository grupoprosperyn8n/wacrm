'use client'
import { cn } from '@/lib/utils'
import { Info, ExternalLink, AlertTriangle } from 'lucide-react'

interface Step { title: string; description: string; url?: string }
interface Props { title: string; steps: Step[]; warning?: string; className?: string }

export function SetupGuide({ title, steps, warning, className }: Props) {
  return (
    <div className={cn('rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-3', className)}>
      <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-400">
        <Info className="h-4 w-4" /> {title}
      </h4>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
            <div>
              <span className="font-medium text-foreground">{step.title}</span>
              {step.description && <p className="mt-0.5">{step.description}</p>}
              {step.url && (
                <a href={step.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 mt-0.5">
                  <ExternalLink className="h-3 w-3" /> Abrir <span className="truncate max-w-[200px]">{step.url.replace('https://', '')}</span>
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
      {warning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">{warning}</p>
        </div>
      )}
    </div>
  )
}
