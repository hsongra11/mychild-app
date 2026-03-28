'use client'

import { useState, useTransition } from 'react'
import { serverComputeAge } from '@/app/actions'
import type { AgeResult } from 'mychild-engine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ChildFormProps {
  onChildSet: (dob: string, gestationalWeeks?: number) => void
  currentDob?: string
  currentGestWeeks?: number
}

function formatAge(age: AgeResult): string {
  const mo = age.chronologicalMonths
  const wk = age.chronologicalWeeks % 4
  const parts: string[] = []
  if (mo > 0) parts.push(`${mo}mo`)
  if (wk > 0 || mo === 0) parts.push(`${wk}wk`)
  return parts.join(' ')
}

export function ChildForm({ onChildSet, currentDob, currentGestWeeks }: ChildFormProps) {
  const [dob, setDob] = useState(currentDob ?? '')
  const [gestWeeks, setGestWeeks] = useState(currentGestWeeks?.toString() ?? '')
  const [age, setAge] = useState<AgeResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDobChange(value: string) {
    setDob(value)
    setAge(null)
    if (value) {
      startTransition(async () => {
        try {
          const gw = gestWeeks ? parseInt(gestWeeks, 10) : undefined
          const result = await serverComputeAge(value, gw)
          setAge(result)
        } catch {
          setAge(null)
        }
      })
    }
  }

  function handleGestWeeksChange(value: string) {
    setGestWeeks(value)
    setAge(null)
    if (dob) {
      startTransition(async () => {
        try {
          const gw = value ? parseInt(value, 10) : undefined
          const result = await serverComputeAge(dob, gw)
          setAge(result)
        } catch {
          setAge(null)
        }
      })
    }
  }

  function handleSubmit() {
    if (!dob) return
    const gw = gestWeeks ? parseInt(gestWeeks, 10) : undefined
    onChildSet(dob, gw)
  }

  const showCorrected = age?.isPreterm && age?.useCorrectedAge

  return (
    <Card>
      <CardHeader>
        <CardTitle>Child Setup</CardTitle>
        <CardDescription>Enter birth details to begin screening</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="dob">
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => handleDobChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="gest-weeks">
                Gestational Weeks{' '}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="gest-weeks"
                type="number"
                value={gestWeeks}
                onChange={(e) => handleGestWeeksChange(e.target.value)}
                min={22}
                max={42}
                placeholder="e.g. 32 — leave blank for full-term"
                className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              />
            </div>
          </div>

          {age && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Age:</span>
              <span className="font-medium">{formatAge(age)} chronological</span>
              {showCorrected && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {age.correctedMonths}mo {age.correctedWeeks % 4}wk corrected
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {age.weeksEarly}wk early
                  </Badge>
                </>
              )}
              {isPending && <span className="text-xs text-muted-foreground">updating…</span>}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!dob || isPending}
            className="w-full sm:w-auto"
          >
            Start Screening
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
