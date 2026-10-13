// Shared with the Edge Function so request and form limits stay aligned.
export {
  questionSchema, questionsSchema, readQuestions, readAnswers, validateAnswers, COVER_NOTE_MAX,
  type Question, type QuestionAnswer,
} from '../../supabase/functions/_shared/application-contract.ts'
