'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SerializedAnswerEvent, SerializedChild } from '@/app/actions'
import { ChildForm } from '@/components/child-form'
import { ScreeningPanel } from '@/components/screening-panel'
import { ResultsPanel } from '@/components/results-panel'
import { SimulatorPanel } from '@/components/simulator-panel'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const STORAGE_KEY_CHILD = 'mychild-demo-child'
const STORAGE_KEY_ANSWERS = 'mychild-demo-answers'

export function ScreeningDemo() {
  const [child, setChild] = useState<SerializedChild | null>(null)
  const [answers, setAnswers] = useState<SerializedAnswerEvent[]>([])
  const [activeTab, setActiveTab] = useState('screening')

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const storedChild = localStorage.getItem(STORAGE_KEY_CHILD)
      if (storedChild) setChild(JSON.parse(storedChild) as SerializedChild)

      const storedAnswers = localStorage.getItem(STORAGE_KEY_ANSWERS)
      if (storedAnswers) setAnswers(JSON.parse(storedAnswers) as SerializedAnswerEvent[])
    } catch {
      // ignore
    }
  }, [])

  const handleChildSet = useCallback((dob: string, gestationalWeeks?: number) => {
    const c: SerializedChild = { dob, gestationalWeeks }
    setChild(c)
    setAnswers([])
    localStorage.setItem(STORAGE_KEY_CHILD, JSON.stringify(c))
    localStorage.removeItem(STORAGE_KEY_ANSWERS)
  }, [])

  const handleAnswerAdded = useCallback((event: SerializedAnswerEvent) => {
    setAnswers((prev) => {
      // Replace existing answer for same question, or append
      const without = prev.filter((a) => a.questionId !== event.questionId)
      const next = [...without, event]
      localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Child setup */}
      <ChildForm
        onChildSet={handleChildSet}
        currentDob={child?.dob}
        currentGestWeeks={child?.gestationalWeeks}
      />

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="screening">Screening</TabsTrigger>
          <TabsTrigger value="results">
            Results
            {answers.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {answers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="screening" className="mt-4">
          {child ? (
            <ScreeningPanel
              child={child}
              answers={answers}
              onAnswerAdded={handleAnswerAdded}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              Set up a child above to start the screening.
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          {child ? (
            <ResultsPanel child={child} answers={answers} />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              Set up a child above to see results.
            </div>
          )}
        </TabsContent>

        <TabsContent value="simulator" className="mt-4">
          <SimulatorPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
