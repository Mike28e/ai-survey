// src/app/take-survey/[id]/page.tsx
import SurveyAIForm from '@/components/SurveyAIForm'

interface Props { params: { id: string } }

export default function TakeSurveyPage({ params }: Props) {
  return <SurveyAIForm surveyId={params.id} />
}
