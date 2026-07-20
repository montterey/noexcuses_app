import { ProgramDayContent, ProgramExercise } from '../types';
import { ANNUAL_EXERCISES } from './annualHomeExercises';
import { getAnnualExerciseGuide } from './annualHomeGuides';
import {
  ANNUAL_PHASE_TEMPLATE_OFFSETS,
  ANNUAL_SESSION_TEMPLATES,
} from './annualHomeTemplates';
import { ANNUAL_TARGETS } from './annualHomeTargets';

export { getAnnualExerciseGuide };

export const ANNUAL_HOME_TOTAL_SESSIONS = 208;
export const ANNUAL_HOME_TOTAL_WEEKS = 52;

export interface AnnualHomeExercise extends ProgramExercise {
  guideIndex: number;
}

export interface AnnualHomeSession extends ProgramDayContent {
  week: number;
  workoutCode: 'A' | 'B' | 'C' | 'D';
  phase: string;
  isDeload: boolean;
  exercises: AnnualHomeExercise[];
}

const PHASES = [
  'Адаптация',
  'Базовый объём',
  'Односторонняя работа',
  'Усложнение',
  'Силовой контроль',
  'Продвинутый объём',
  'Закрепление',
  'Тест и разгрузка',
] as const;

function getPhaseIndex(week: number) {
  if (week === 52) return 7;
  if (week >= 49) return 6;
  return Math.min(5, Math.floor((week - 1) / 8));
}

export function getAnnualHomeSession(dayNumber: number): AnnualHomeSession | null {
  if (
    !Number.isInteger(dayNumber)
    || dayNumber < 1
    || dayNumber > ANNUAL_HOME_TOTAL_SESSIONS
  ) {
    return null;
  }

  const week = Math.floor((dayNumber - 1) / 4) + 1;
  const workoutIndex = (dayNumber - 1) % 4;
  const workoutCode = ['A', 'B', 'C', 'D'][workoutIndex] as AnnualHomeSession['workoutCode'];
  const phaseIndex = getPhaseIndex(week);
  const phase = PHASES[phaseIndex];
  const isDeload = week % 8 === 0 || week === 52;
  const [normalOffset, deloadOffset] = ANNUAL_PHASE_TEMPLATE_OFFSETS[phaseIndex];
  const templateOffset = isDeload && deloadOffset !== null
    ? deloadOffset
    : normalOffset;
  const session = ANNUAL_SESSION_TEMPLATES[templateOffset + workoutIndex];

  if (!session) return null;

  return {
    day_number: dayNumber,
    week,
    workoutCode,
    phase,
    isDeload,
    title: `Неделя ${week} · Тренировка ${workoutCode} · ${phase}`,
    type: 'workout',
    exercises: session.map(([exerciseIndex, targetIndex]) => {
      const [name, muscles, guideIndex] = ANNUAL_EXERCISES[exerciseIndex];
      const [sets, reps] = ANNUAL_TARGETS[targetIndex];

      return { name, muscles, guideIndex, sets, reps };
    }),
  };
}
