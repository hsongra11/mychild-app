'use client'

import { useEffect, useState, useTransition } from 'react'
import { serverGetDueQuestions, serverEvaluate } from '@/app/actions'
import type { SerializedAnswerEvent, SerializedChild } from '@/app/actions'
import type { Question, QuestionResult, Severity } from '@mychild/engine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const DOMAIN_LABELS: Record<string, string> = {
  GM: 'Gross Motor',
  FM: 'Fine Motor',
  RL: 'Receptive Language',
  EL: 'Expressive Language',
  SE: 'Social-Emotional',
  CP: 'Cognitive / Problem Solving',
  SH: 'Self-Help / Adaptive',
  VH: 'Vision & Hearing',
  RF: 'Red Flags',
}

function severityColor(s: Severity): string {
  switch (s) {
    case 'flag':
      return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
    case 'warning':
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
    case 'precaution':
      return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
    case 'watch':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
    default:
      return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
  }
}

function severityLabel(s: Severity): string {
  switch (s) {
    case 'flag': return 'Flag'
    case 'warning': return 'Warning'
    case 'precaution': return 'Precaution'
    case 'watch': return 'Watch'
    case 'reminder': return 'Reminder'
    case 'normal': return 'On Track'
    default: return s
  }
}

interface ScreeningPanelProps {
  child: SerializedChild
  answers: SerializedAnswerEvent[]
  onAnswerAdded: (event: SerializedAnswerEvent) => void
}

export function ScreeningPanel({ child, answers, onAnswerAdded }: ScreeningPanelProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [severityMap, setSeverityMap] = useState<Record<string, QuestionResult>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const [dueQs, result] = await Promise.all([
          serverGetDueQuestions(child, answers),
          answers.length > 0 ? serverEvaluate(child, answers) : null,
        ])
        setQuestions(dueQs)
        if (result) {
          const map: Record<string, QuestionResult> = {}
          for (const qr of result.questions) {
            map[qr.questionId] = qr
          }
          setSeverityMap(map)
        }
      } catch (err) {
        console.error('Error loading questions:', err)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.dob, child.gestationalWeeks, answers])

  function handleAnswer(questionId: string, answer: 'achieved' | 'not_yet' | 'unsure') {
    const event: SerializedAnswerEvent = {
      questionId,
      answer,
      timestamp: new Date().toISOString(),
    }
    onAnswerAdded(event)
  }

  // Group questions by first domain tag
  const grouped = new Map<string, Question[]>()
  for (const q of questions) {
    const domain = q.tags[0] ?? 'RF'
    if (!grouped.has(domain)) grouped.set(domain, [])
    grouped.get(domain)!.push(q)
  }

  const answeredIds = new Set(answers.map((a) => a.questionId))

  if (isPending && questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading questions…
        </CardContent>
      </Card>
    )
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No questions due right now. All milestones are either achieved or not yet in window.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(grouped.entries()).map(([domain, qs]) => (
        <Card key={domain}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {DOMAIN_LABELS[domain] ?? domain}
              <Badge variant="outline" className="font-mono text-xs">
                {domain}
              </Badge>
            </CardTitle>
            <CardDescription>
              {qs.length} question{qs.length !== 1 ? 's' : ''} due
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {qs.map((q, idx) => {
                const answered = answers.find((a) => a.questionId === q.id)
                const qResult = severityMap[q.id]

                return (
                  <div key={q.id}>
                    {idx > 0 && <Separator className="mb-3" />}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium leading-snug">{q.text}</p>
                          {q.subtext && (
                            <p className="text-xs text-muted-foreground">{q.subtext}</p>
                          )}
                          <p className="font-mono text-[10px] text-muted-foreground/60">
                            {q.id}
                          </p>
                        </div>
                        {answered && qResult && (
                          <span
                            className={`shrink-0 inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium ${severityColor(qResult.severity)}`}
                          >
                            {severityLabel(qResult.severity)}
                          </span>
                        )}
                      </div>

                      {!answered ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/40 text-green-600 hover:bg-green-500/10 dark:text-green-400"
                            onClick={() => handleAnswer(q.id, 'achieved')}
                          >
                            Yes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-500/40 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
                            onClick={() => handleAnswer(q.id, 'not_yet')}
                          >
                            Not yet
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10 dark:text-yellow-400"
                            onClick={() => handleAnswer(q.id, 'unsure')}
                          >
                            Unsure
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Answered:{' '}
                            <span className="font-medium capitalize">
                              {answered.answer.replace('_', ' ')}
                            </span>
                          </span>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="h-5 px-2 text-xs text-muted-foreground"
                            onClick={() => handleAnswer(q.id, 'achieved')}
                          >
                            Change
                          </Button>
                        </div>
                      )}

                      {answered && qResult?.suggestedProbes && qResult.suggestedProbes.length > 0 && (
                        <div className="rounded-md border border-border bg-muted/30 p-2">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Suggested probes:
                          </p>
                          <ul className="list-inside list-disc text-xs text-muted-foreground">
                            {qResult.suggestedProbes.map((probe) => (
                              <li key={probe}>{probe}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
