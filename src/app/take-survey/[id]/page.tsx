import SurveyAIForm from '@/components/SurveyAIForm'

export default function TakeSurveyPage({ params }: { params: { id: string } }) {
  return <SurveyAIForm surveyId={params.id} />
}
