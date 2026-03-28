'use client'

import { useState, useTransition } from 'react'
import { serverSimulate } from '@/app/actions'
import type { Ruleset, SimulationResult, TrajectoryResult, TimelineEvent, DomainStatus, Severity } from 'mychild-engine'
import type { Trajectory } from 'mychild-engine'
import { BUILT_IN_TRAJECTORIES } from '@/lib/trajectories'
import { DEFAULT_THRESHOLDS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

function severityDot(s: Severity): string {
  switch (s) {
    case 'flag': return 'bg-red-500'
    case 'warning': return 'bg-orange-500'
    case 'precaution': return 'bg-yellow-500'
    case 'watch': return 'bg-blue-500'
    default: return 'bg-green-500'
  }
}

function domainStatusColor(s: DomainStatus): string {
  switch (s) {
    case 'high_concern': return 'text-red-600 dark:text-red-400'
    case 'moderate_concern': return 'text-orange-600 dark:text-orange-400'
    case 'low_concern': return 'text-yellow-600 dark:text-yellow-400'
    case 'watch': return 'text-blue-600 dark:text-blue-400'
    case 'insufficient_evidence': return 'text-zinc-500'
    default: return 'text-green-600 dark:text-green-400'
  }
}

function domainStatusShort(s: DomainStatus): string {
  switch (s) {
    case 'high_concern': return 'HIGH'
    case 'moderate_concern': return 'MOD'
    case 'low_concern': return 'LOW'
    case 'watch': return 'WATCH'
    case 'insufficient_evidence': return '—'
    default: return 'OK'
  }
}

const DOMAIN_TAGS = ['GM', 'FM', 'RL', 'EL', 'SE', 'CP', 'SH', 'VH']

interface ThresholdSliderProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

function ThresholdSlider({ label, value, min, max, onChange }: ThresholdSliderProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-primary"
      />
      <span className="w-8 text-right font-mono text-xs">{value}</span>
    </div>
  )
}

export function SimulatorPanel() {
  const [selectedId, setSelectedId] = useState<string>('normal')
  const [ruleset, setRuleset] = useState<Ruleset>(DEFAULT_THRESHOLDS as Ruleset)
  const [compareMode, setCompareMode] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const selected = BUILT_IN_TRAJECTORIES.find((t) => t.id === selectedId)!

  function handleRun() {
    startTransition(async () => {
      try {
        const baseline = compareMode ? (DEFAULT_THRESHOLDS as Ruleset) : undefined
        const r = await serverSimulate([selected as Trajectory], ruleset, baseline)
        setResult(r)
      } catch (err) {
        console.error('Simulation error:', err)
      }
    })
  }

  function handleThresholdChange(key: keyof Ruleset['thresholds'], value: number) {
    setRuleset((prev) => ({
      ...prev,
      thresholds: { ...prev.thresholds, [key]: value },
    }))
    setResult(null)
  }

  const trajectoryResult: TrajectoryResult | null = result?.trajectories[0] ?? null

  return (
    <div className="flex flex-col gap-4">
      {/* Trajectory selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Trajectory</CardTitle>
          <CardDescription>Pre-loaded developmental patterns to explore</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {BUILT_IN_TRAJECTORIES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedId(t.id); setResult(null) }}
                className={`flex flex-col rounded-lg border px-3 py-2 text-left transition-colors ${
                  selectedId === t.id
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Threshold tuner */}
      <Card>
        <CardHeader>
          <CardTitle>Threshold Adjuster</CardTitle>
          <CardDescription>
            Tune scoring thresholds and compare against defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <ThresholdSlider
              label="T_yellow"
              value={ruleset.thresholds.T_yellow}
              min={0.5}
              max={5}
              onChange={(v) => handleThresholdChange('T_yellow', v)}
            />
            <ThresholdSlider
              label="T_orange"
              value={ruleset.thresholds.T_orange}
              min={1}
              max={8}
              onChange={(v) => handleThresholdChange('T_orange', v)}
            />
            <ThresholdSlider
              label="T_red"
              value={ruleset.thresholds.T_red}
              min={2}
              max={12}
              onChange={(v) => handleThresholdChange('T_red', v)}
            />
            <div className="mt-1 flex items-center gap-2">
              <input
                id="compare-mode"
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                className="accent-primary"
              />
              <label htmlFor="compare-mode" className="text-sm text-muted-foreground">
                Compare against default thresholds
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleRun} disabled={isPending}>
                {isPending ? 'Running…' : 'Run Simulation'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRuleset(DEFAULT_THRESHOLDS as Ruleset)
                  setResult(null)
                }}
              >
                Reset Thresholds
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {trajectoryResult && (
        <>
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline — {trajectoryResult.trajectoryName}</CardTitle>
              <CardDescription>
                {trajectoryResult.timeline.length} event
                {trajectoryResult.timeline.length !== 1 ? 's' : ''} recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {trajectoryResult.timeline.map((event: TimelineEvent, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 shrink-0 font-mono text-xs text-muted-foreground">
                      wk{String(event.weekOffset).padStart(2, '0')}
                    </span>
                    <div
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${severityDot(event.severity)}`}
                    />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm">
                        <span className="font-mono text-xs text-muted-foreground">
                          {event.questionId}
                        </span>{' '}
                        — answered{' '}
                        <span className="font-medium capitalize">
                          {event.answer.replace('_', ' ')}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {DOMAIN_TAGS.map((tag) => {
                          const status = event.domainStatuses[tag] as DomainStatus | undefined
                          if (!status || status === 'insufficient_evidence') return null
                          return (
                            <span
                              key={tag}
                              className={`font-mono text-[10px] ${domainStatusColor(status)}`}
                            >
                              {tag}:{domainStatusShort(status)}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Final domain status */}
          <Card>
            <CardHeader>
              <CardTitle>Final Domain Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DOMAIN_TAGS.map((tag) => {
                  const d = Object.values(trajectoryResult.finalDomainStatus).find(
                    (x) => x.domainTag === tag,
                  )
                  if (!d) return null
                  return (
                    <div
                      key={tag}
                      className="flex flex-col rounded-lg border border-border bg-muted/20 px-2 py-2"
                    >
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {tag}
                      </span>
                      <span
                        className={`text-xs font-medium ${domainStatusColor(d.status)}`}
                      >
                        {domainStatusShort(d.status)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Diffs (compare mode) */}
          {compareMode && result && result.diffs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Threshold Diff</CardTitle>
                <CardDescription>
                  Questions where severity changed vs. default thresholds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {result.diffs.map((diff, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        wk{diff.weekOffset} · {diff.questionId}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {diff.baselineSeverity}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {diff.newSeverity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{diff.reason}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {compareMode && result && result.diffs.length === 0 && (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              No severity changes detected with the current threshold adjustments.
            </div>
          )}
        </>
      )}
    </div>
  )
}
