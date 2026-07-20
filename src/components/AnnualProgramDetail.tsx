import { Play, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  AnnualHomeExercise,
  AnnualHomeSession,
  getAnnualExerciseGuide,
} from '../data/annualHomeProgram';

interface AnnualProgramDetailProps {
  programTitle: string;
  currentDay: number;
  totalDays: number;
  dayContent: AnnualHomeSession | null;
  contentLoading: boolean;
  contentError: string | null;
  completionError: string | null;
  completionAlreadySaved: boolean;
  isCompleting: boolean;
  onClose: () => void;
  onCompleteDay: () => Promise<void>;
}

type WorkoutMode = 'overview' | 'exercise' | 'rest' | 'complete';

type WorkoutQueueItem = AnnualHomeExercise & {
  setNumber: number;
  totalSets: number;
};

function buildWorkoutQueue(exercises: AnnualHomeExercise[]): WorkoutQueueItem[] {
  const queue: WorkoutQueueItem[] = [];
  const withSets = exercises.map((exercise) => ({
    exercise,
    totalSets: Math.max(1, Number(exercise.sets) || 1),
  }));
  const maxSets = Math.max(0, ...withSets.map(({ totalSets }) => totalSets));

  for (let setNumber = 1; setNumber <= maxSets; setNumber += 1) {
    for (const { exercise, totalSets } of withSets) {
      if (setNumber > totalSets) continue;
      queue.push({ ...exercise, setNumber, totalSets });
    }
  }

  return queue;
}

function getTimerSeconds(reps: string | number): number | null {
  if (typeof reps !== 'string') return null;

  const minuteMatch = reps.match(/(\d+)(?:[–-](\d+))?\s*мин/i);
  if (minuteMatch) {
    return Number(minuteMatch[2] || minuteMatch[1]) * 60;
  }

  const secondMatches = Array.from(reps.matchAll(/(\d+)(?:[–-](\d+))?\s*сек/gi));
  const lastMatch = secondMatches[secondMatches.length - 1];
  if (!lastMatch) return null;

  return Number(lastMatch[2] || lastMatch[1]);
}

function CountdownTimer({ seconds }: { seconds: number }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTimeLeft(seconds);
    setIsRunning(false);
  }, [seconds]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const remainingSeconds = timeLeft % 60;
  const label = minutes > 0
    ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
    : String(timeLeft);

  return (
    <div className="rounded-xl bg-surface border border-white/5 p-4 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-gray-500 text-xs mb-1">Таймер</p>
          <p className="text-3xl font-bold text-accent">{label}</p>
        </div>

        <button
          onClick={() => {
            if (timeLeft === 0) setTimeLeft(seconds);
            setIsRunning((value) => !value);
          }}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium active:scale-95 transition-all"
        >
          {isRunning ? 'Пауза' : timeLeft === 0 ? 'Повторить' : 'Старт'}
        </button>
      </div>
    </div>
  );
}

export function AnnualProgramDetail({
  programTitle,
  currentDay,
  totalDays,
  dayContent,
  contentLoading,
  contentError,
  completionError,
  completionAlreadySaved,
  isCompleting,
  onClose,
  onCompleteDay,
}: AnnualProgramDetailProps) {
  const [mode, setMode] = useState<WorkoutMode>('overview');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restSeconds, setRestSeconds] = useState(45);

  const queue = useMemo(
    () => (dayContent ? buildWorkoutQueue(dayContent.exercises) : []),
    [dayContent]
  );
  const currentExercise = queue[currentIndex];
  const nextExercise = queue[currentIndex + 1];
  const progress = queue.length
    ? Math.min(100, ((currentIndex + 1) / queue.length) * 100)
    : 0;

  useEffect(() => {
    if (mode !== 'rest') return;

    const interval = window.setInterval(() => {
      setRestSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setCurrentIndex((index) => index + 1);
          setMode('exercise');
          return 45;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [mode]);

  if (contentLoading || !dayContent) {
    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center p-4">
        <div className="max-w-[430px] w-full text-center">
          {contentLoading ? (
            <>
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Загрузка тренировки...</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-3">
                {contentError || 'Контент этой тренировки пока недоступен'}
              </h2>
              <button
                onClick={onClose}
                className="w-full py-3 bg-surface rounded-xl text-white border border-white/10"
              >
                Закрыть
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const sessionNumber = dayContent.day_number || currentDay;
  const isFinalSession = sessionNumber === totalDays;
  const guide = currentExercise
    ? getAnnualExerciseGuide(currentExercise.guideIndex)
    : null;
  const timerSeconds = currentExercise
    ? getTimerSeconds(currentExercise.reps)
    : null;

  const finishCurrentSet = () => {
    if (currentIndex + 1 >= queue.length) {
      setMode('complete');
      return;
    }

    setRestSeconds(45);
    setMode('rest');
  };

  const skipRest = () => {
    setCurrentIndex((index) => index + 1);
    setRestSeconds(45);
    setMode('exercise');
  };

  if (mode === 'overview') {
    return (
      <div className="fixed inset-0 bg-dark z-50 overflow-y-auto">
        <div className="max-w-[430px] mx-auto p-4 pb-8">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-surface flex items-center justify-center"
            >
              <X size={20} className="text-gray-400" />
            </button>
            <h1 className="text-lg font-bold text-center">{programTitle}</h1>
            <div className="w-10" />
          </div>

          <div className="bg-surface rounded-2xl p-5 border border-white/5 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-4xl">🏠</span>
              <div>
                <p className="text-gray-400 text-sm">
                  Тренировка {sessionNumber} из {totalDays} · Неделя {dayContent.week} из 52
                </p>
                <h2 className="text-xl font-bold mt-1">
                  Тренировка {dayContent.workoutCode}
                </h2>
                <p className="text-accent text-sm mt-1">{dayContent.phase}</p>
              </div>
            </div>

            {dayContent.isDeload && (
              <div className="mt-4 rounded-xl bg-blue-400/10 border border-blue-400/20 p-3">
                <p className="text-blue-300 text-sm font-medium">
                  Разгрузочная неделя: оставляй около 4 повторов в запасе и не работай до отказа.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {dayContent.exercises.map((exercise, index) => (
              <div
                key={`${exercise.name}-${index}`}
                className="bg-surface rounded-xl p-4 border border-white/5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent font-bold text-sm">{index + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{exercise.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{exercise.muscles}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-accent font-semibold">{exercise.reps}</p>
                  <p className="text-gray-500 text-xs">×{exercise.sets || 1}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setCurrentIndex(0);
              setMode(queue.length ? 'exercise' : 'complete');
            }}
            className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Play size={22} />
            Запустить тренировку
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'exercise' && currentExercise) {
    return (
      <div className="fixed inset-0 bg-dark z-50 overflow-y-auto">
        <div className="max-w-[430px] mx-auto p-4 pb-8">
          <div className="flex items-center justify-between mb-4 pt-2">
            <button
              onClick={() => setMode('overview')}
              className="w-10 h-10 rounded-full bg-surface flex items-center justify-center"
            >
              <X size={20} className="text-gray-400" />
            </button>
            <p className="text-sm text-gray-400">
              {currentIndex + 1} из {queue.length}
            </p>
            <div className="w-10" />
          </div>

          <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-center mb-4">
            <span className="text-xs text-gray-500 bg-surface px-3 py-1 rounded-full">
              Подход {currentExercise.setNumber} из {currentExercise.totalSets}
            </span>
          </div>

          <div
            className="rounded-2xl bg-surface border border-white/5 mb-4 flex items-center justify-center"
            style={{ aspectRatio: '16/9' }}
          >
            <div className="text-center px-6">
              <p className="text-6xl mb-3">💪</p>
              <p className="text-gray-400 text-sm">{currentExercise.muscles}</p>
            </div>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-2">{currentExercise.name}</h2>
            <p className="text-3xl font-bold text-accent">{currentExercise.reps}</p>
          </div>

          {guide?.description && (
            <div className="bg-accent/10 rounded-xl p-3 border border-accent/20 mb-4">
              <p className="text-xs text-accent mb-1">Техника</p>
              <p className="text-sm text-gray-300">{guide.description}</p>
            </div>
          )}

          {guide?.tips && (
            <div className="bg-surface rounded-xl p-3 border border-white/5 mb-4">
              <p className="text-xs text-gray-500 mb-1">Как упростить, усложнить и выполнять безопасно</p>
              <p className="text-sm text-gray-300">{guide.tips}</p>
            </div>
          )}

          {timerSeconds && <CountdownTimer seconds={timerSeconds} />}

          <button
            onClick={finishCurrentSet}
            className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all"
          >
            ✅ Подход выполнен
          </button>

          {nextExercise && (
            <p className="text-center text-gray-500 text-sm mt-3">
              Следующее: <span className="text-white">{nextExercise.name}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'rest') {
    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center p-4">
        <div className="max-w-[430px] w-full text-center">
          <p className="text-gray-400 text-lg mb-4">Отдых между подходами</p>
          <div className="w-40 h-40 rounded-full border-4 border-accent flex items-center justify-center mx-auto mb-6">
            <div>
              <p className="text-5xl font-bold text-accent">{restSeconds}</p>
              <p className="text-gray-400 text-sm">сек</p>
            </div>
          </div>

          {nextExercise && (
            <div className="bg-surface rounded-xl p-4 border border-white/5 mb-6">
              <p className="text-gray-400 text-sm mb-1">Следующее упражнение</p>
              <p className="text-xl font-bold">{nextExercise.name}</p>
              <p className="text-accent mt-1">{nextExercise.reps}</p>
            </div>
          )}

          <button
            onClick={skipRest}
            className="w-full py-3 bg-surface rounded-xl text-gray-400 font-medium border border-white/10 active:scale-95 transition-all"
          >
            Пропустить отдых →
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'complete') {
    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center p-4">
        <div className="max-w-[430px] w-full text-center">
          <p className="text-8xl mb-6">{isFinalSession ? '🏆' : '✅'}</p>
          <h2 className="text-3xl font-bold mb-2">
            {completionAlreadySaved
              ? 'Результат уже сохранён'
              : isFinalSession
                ? 'Годовая программа завершена!'
                : 'Тренировка завершена!'}
          </h2>
          <p className="text-gray-400 mb-2">
            Тренировка {sessionNumber} из {totalDays} выполнена
          </p>
          {!completionAlreadySaved && (
            <p className="text-accent font-semibold mb-6">
              +{isFinalSession ? 500 : 25} XP
            </p>
          )}

          {completionAlreadySaved && (
            <p className="text-gray-400 mb-6">
              Эта тренировка уже была учтена. XP повторно не начислен.
            </p>
          )}

          {completionError && (
            <p className="text-red-400 text-sm mb-4">{completionError}</p>
          )}

          <div className="bg-surface rounded-xl p-4 border border-white/5 mb-6">
            <p className="text-gray-400 text-sm">Выполнено подходов</p>
            <p className="text-3xl font-bold text-accent">{queue.length}</p>
          </div>

          <button
            onClick={completionAlreadySaved ? onClose : () => void onCompleteDay()}
            disabled={isCompleting}
            className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {completionAlreadySaved
              ? 'Закрыть'
              : isCompleting
                ? 'Сохраняем...'
                : 'Сохранить результат'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
