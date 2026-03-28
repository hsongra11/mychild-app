'use client'

import { useEffect, useState, useTransition } from 'react'
import { serverEvaluate } from '@/app/actions'
import type { SerializedAnswerEvent, SerializedChild } from '@/app/actions'
import type { ScreeningResult, DomainStatus, GlobalStatus } from 'mychild-engine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const DOMAIN_ORDER = ['GM', 'FM', 'RL', 'EL', 'SE', 'CP', 'SH', 'VH']

function domainStatusColor(s: DomainStatus): string {
  switch (s) {
    case 'high_concern':
      return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
    case 'moderate_concern':
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
    case 'low_concern':
      return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
    case 'watch':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'insufficient_evidence':
      return 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
    default:
      return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
  }
}

function domainStatusLabel(s: DomainStatus): string {
  switch (s) {
    case 'high_concern': return 'High Concern'
    case 'moderate_concern': return 'Moderate Concern'
    case 'low_concern': return 'Low Concern'
    case 'watch': return 'Watch'
    case 'insufficient_evidence': return 'Insufficient Data'
    case 'normal': return 'On Track'
    default: return s
  }
}

function globalStatusBg(level: GlobalStatus['level']): string {
  switch (level) {
    case 'red': return 'border-red-500/30 bg-red-500/10'
    case 'orange': return 'border-orange-500/30 bg-orange-500/10'
    case 'yellow': return 'border-yellow-500/30 bg-yellow-500/10'
    default: return 'border-green-500/30 bg-green-500/10'
  }
}

function globalStatusTextColor(level: GlobalStatus['level']): string {
  switch (level) {
    case 'red': return 'text-red-700 dark:text-red-400'
    case 'orange': return 'text-orange-700 dark:text-orange-400'
    case 'yellow': return 'text-yellow-700 dark:text-yellow-400'
    default: return 'text-green-700 dark:text-green-400'
  }
}

const ACTION_URGENCY_COLOR: Record<string, string> = {
  urgent: 'text-red-600 dark:text-red-400',
  soon: 'text-orange-600 dark:text-orange-400',
  routine: 'text-muted-foreground',
}

interface ResultsPanelProps {
  child: SerializedChild
  answers: SerializedAnswerEvent[]
}

export function ResultsPanel({ child, answers }: ResultsPanelProps) {
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (answers.length === 0) {
      setResult(null)
      return
    }
    startTransition(async () => {
      try {
        const r = await serverEvaluate(child, answers)
        setResult(r)
      } catch (err) {
        console.error('Error evaluating:', err)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.dob, child.gestationalWeeks, answers])

  if (answers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Answer some questions in the Screening tab to see results here.
        </CardContent>
      </Card>
    )
  }

  if (isPending && !result) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Calculating results…
        </CardContent>
      </Card>
    )
  }

  if (!result) return null

  const orderedDomains = DOMAIN_ORDER
    .map((tag) => {
      const entry = Object.values(result.domains).find((d) => d.domainTag === tag)
      return entry
    })
    .filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      {/* Global status banner */}
      <div
        className={`rounded-xl border px-4 py-3 ${globalStatusBg(result.globalStatus.level)}`}
      >
        <p className={`font-medium ${globalStatusTextColor(result.globalStatus.level)}`}>
          {result.globalStatus.message}
        </p>
      </div>

      {/* Domain cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {orderedDomains.map((d) => {
          if (!d) return null
          return (
            <Card key={d.domainTag} size="sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{d.domain}</CardTitle>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${domainStatusColor(d.status)}`}
                  >
                    {domainStatusLabel(d.status)}
                  </span>
                </div>
                <CardDescription>{d.explanation}</CardDescription>
              </CardHeader>
              {d.triggeringMilestones.length > 0 && (
                <CardContent>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Triggering milestones:
                  </p>
                  <ul className="list-inside list-disc text-xs text-muted-foreground">
                    {d.triggeringMilestones.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Next actions */}
      {result.nextActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {result.nextActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 shrink-0 font-mono text-xs uppercase ${ACTION_URGENCY_COLOR[action.urgency] ?? 'text-muted-foreground'}`}
                  >
                    [{action.urgency}]
                  </span>
                  <span>{action.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Disclaimer: </span>
          {result.disclaimer}
        </p>
      </div>
    </div>
  )
}
