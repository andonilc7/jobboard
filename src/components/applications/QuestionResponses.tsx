import { readAnswers } from '@/lib/questions'

export function QuestionResponses({ value }: { value: unknown }) {
  const answers = readAnswers(value)
  if (!answers.length) return null
  return <section className="space-y-3" aria-label="Application question responses">
    <h3 className="meta text-muted-foreground">Application questions</h3>
    <dl className="space-y-4">{answers.map((item) => <div key={item.id}>
      <dt className="text-sm font-medium">{item.prompt}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.answer || 'No answer provided (optional)'}</dd>
    </div>)}</dl>
  </section>
}
