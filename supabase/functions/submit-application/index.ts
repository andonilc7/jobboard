import { authenticateCaller } from './auth.ts'
import { createSubmissionController } from './controller.ts'

// Minimal runtime surface keeps this entry point checkable by the existing TypeScript tooling.
declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Promise<Response>): void
}

Deno.serve(createSubmissionController((request) => authenticateCaller(request, Deno.env)))
