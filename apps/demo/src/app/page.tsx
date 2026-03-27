import { ScreeningDemo } from '@/components/screening-demo'
import { Badge } from '@/components/ui/badge'
import { DISCLAIMER } from '@/lib/constants'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">My Child Engine</h1>
              <Badge variant="outline" className="font-mono text-[10px]">
                v0.1
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Open-source developmental screening
            </p>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive dark:text-destructive">
              NOT A DIAGNOSTIC TOOL
            </span>
          </div>
        </div>
      </header>

      {/* Disclaimer banner */}
      <div className="border-b border-border bg-muted/50 px-4 py-2 sm:px-6">
        <p className="mx-auto max-w-4xl text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Important: </span>
          {DISCLAIMER}
        </p>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <ScreeningDemo />
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            @mychild/engine — open-source developmental screening engine
          </p>
          <p className="text-xs text-muted-foreground">
            For informational purposes only. Always consult a healthcare professional.
          </p>
        </div>
      </footer>
    </div>
  )
}
