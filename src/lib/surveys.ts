import { moneySurvey } from '../data/money';
import type { SurveyDefinition } from './types';

const surveys: SurveyDefinition[] = [moneySurvey];

export function listSurveys(): SurveyDefinition[] {
  return surveys;
}

export function getSurvey(slug: string): SurveyDefinition | undefined {
  return surveys.find((survey) => survey.slug === slug);
}
