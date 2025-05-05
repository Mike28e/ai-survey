export type QuestionType = 'single' | 'multi' | 'open'

export interface Choice {
  id?: string
  text: string
}

export interface Question {
  id?: string
  text: string
  type: QuestionType
  choices: Choice[]
}

export interface Survey {
  title: string
  questions: Question[]
}
