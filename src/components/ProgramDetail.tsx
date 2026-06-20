import { X, Play } from 'lucide-react';
import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProgramCode, ProgramDayContent, ProgramExercise } from '../types';

interface ExerciseInfo {
  name?: string;
  youtube_id?: string | null;
  description?: string | null;
  tips?: string | null;
  muscles?: string | null;
}

type WorkoutQueueItem = ProgramExercise & {
  setNumber: number;
  totalSets: number;
};

interface ProgramDetailProps {
  programCode: ProgramCode;
  programTitle: string;
  currentDay: number;
  dayContent: ProgramDayContent | null;
  contentLoading: boolean;
  contentError: string | null;
  completionError: string | null;
  isCompleting: boolean;
  onClose: () => void;
  onCompleteDay: () => Promise<void>;
}

type WorkoutMode = 'overview' | 'exercise' | 'rest' | 'complete';

const TYPE_CONFIG = {
  workout: {
    icon: '💪',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    label: 'Силовая',
  },
  cardio: {
    icon: '🏃',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    label: 'Кардио',
  },
  rest: {
    icon: '😴',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    label: 'Отдых',
  },
  stretch: {
    icon: '🧘',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    label: 'Растяжка',
  },
};

function ExerciseTimer({ seconds }: { seconds: number }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const start = () => {
    if (running || done) return;

    setRunning(true);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setRunning(false);
          setDone(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  const reset = () => {
    setTimeLeft(seconds);
    setDone(false);
    setRunning(false);
  };

  const percentage = seconds > 0 ? ((seconds - timeLeft) / seconds) * 100 : 0;

  return (
    <div className="bg-surface rounded-xl p-4 border border-white/5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium flex items-center gap-2">
          ⏱ Таймер
        </p>

        {done && (
          <span className="text-green-400 text-sm font-medium">
            ✅ Готово!
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-accent flex items-center justify-center">
          <span className="text-xl font-bold text-accent">{timeLeft}</span>
        </div>

        <div className="flex-1">
          <div className="h-2 bg-dark-300 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-accent rounded-full transition-all duration-1000"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {!running && !done && (
            <button
              onClick={start}
              className="w-full py-2 bg-accent rounded-lg text-white text-sm font-medium active:scale-95 transition-all"
            >
              ▶ Запустить {seconds} сек
            </button>
          )}

          {running && (
            <p className="text-center text-gray-400 text-sm">Выполняй...</p>
          )}

          {done && (
            <button
              onClick={reset}
              className="w-full py-2 bg-surface-light rounded-lg text-gray-400 text-sm font-medium"
            >
              Повторить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildWorkoutQueue(exercises: ProgramExercise[]): WorkoutQueueItem[] {
  const queue: WorkoutQueueItem[] = [];

  for (const exercise of exercises) {
    const isTask = exercise.type === 'task';

    const totalSets = isTask
      ? 1
      : Math.max(1, Number(exercise.sets) || 1);

    for (let set = 1; set <= totalSets; set++) {
      queue.push({
        ...exercise,
        type: exercise.type || 'exercise',
        sets: totalSets,
        setNumber: set,
        totalSets,
      });
    }
  }

  return queue;
}

function normalizeExerciseName(name: string) {
  return name.trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ');
}

function getEmbeddedExerciseInfo(exercise?: ProgramExercise): ExerciseInfo | null {
  if (!exercise) return null;

  const info: ExerciseInfo = {
    name: exercise.name,
    youtube_id: exercise.youtube_id,
    description: exercise.description,
    tips: exercise.tips,
    muscles: exercise.muscles,
  };

  return Object.values(info).some((value) => value != null && value !== '')
    ? info
    : null;
}

function getSecondsFromReps(reps: string | number): number | null {
  if (typeof reps !== 'string') return null;

  const value = parseInt(reps, 10);

  if (Number.isNaN(value)) return null;

  if (reps.includes('мин')) return value * 60;
  if (reps.includes('сек')) return value;

  return null;
}

export function ProgramDetail({
  programCode,
  programTitle,
  currentDay,
  dayContent,
  contentLoading,
  contentError,
  completionError,
  isCompleting,
  onClose,
  onCompleteDay,
}: ProgramDetailProps) {
  const [mode, setMode] = useState<WorkoutMode>('overview');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exerciseInfo, setExerciseInfo] = useState<ExerciseInfo | null>(null);
  const [restTimer, setRestTimer] = useState(60);
  const [restInterval, setRestInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const exerciseInfoRequestId = useRef(0);

  const queue = dayContent ? buildWorkoutQueue(dayContent.exercises) : [];
  const currentExercise = queue[currentIndex];
  const nextExercise = queue[currentIndex + 1];
  const progress = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0;

  const loadExerciseInfo = async (exercise?: ProgramExercise) => {
    const name = exercise?.name;
    const requestId = exerciseInfoRequestId.current + 1;
    exerciseInfoRequestId.current = requestId;

    if (!name || !exercise) {
      setExerciseInfo(null);
      return;
    }

    const embeddedInfo = getEmbeddedExerciseInfo(exercise);
    setExerciseInfo(embeddedInfo);

    try {
      const fields = 'name, youtube_id, description, tips, muscles';
      const { data: exactMatch, error: exactError } = await supabase
        .from('exercises')
        .select(fields)
        .eq('name', name)
        .maybeSingle();

      if (exactError) throw exactError;

      if (exactMatch) {
        if (requestId === exerciseInfoRequestId.current) {
          setExerciseInfo({ ...(embeddedInfo || {}), ...exactMatch });
        }
        return;
      }

      const normalizedName = normalizeExerciseName(name);
      const fallbackPattern = name.trim().replace(/\s+/g, '%');
      const { data: candidates, error: fallbackError } = await supabase
        .from('exercises')
        .select(fields)
        .ilike('name', fallbackPattern)
        .limit(20);

      if (fallbackError) throw fallbackError;

      const normalizedMatches = (candidates || []).filter(
        (candidate) => normalizeExerciseName(candidate.name || '') === normalizedName
      );

      if (requestId === exerciseInfoRequestId.current) {
        setExerciseInfo(
          normalizedMatches.length === 1
            ? { ...(embeddedInfo || {}), ...normalizedMatches[0] }
            : embeddedInfo
        );
      }
    } catch (error) {
      console.error('Error loading exercise info:', error);

      if (requestId === exerciseInfoRequestId.current) {
        setExerciseInfo(embeddedInfo);
      }
    }
  };

  const startWorkout = async () => {
    if (!queue.length) {
      setMode('complete');
      return;
    }

    setCurrentIndex(0);
    setMode('exercise');
    await loadExerciseInfo(queue[0]);
  };

  const goToNext = async () => {
    if (restInterval) clearInterval(restInterval);

    const next = currentIndex + 1;

    if (next >= queue.length) {
      setMode('complete');
      return;
    }

    setCurrentIndex(next);
    setMode('exercise');
    await loadExerciseInfo(queue[next]);
  };

  const completeExercise = () => {
    if (currentIndex + 1 >= queue.length) {
      setMode('complete');
      return;
    }

    const isTask = currentExercise?.type === 'task';

    if (isTask || programCode === 'running') {
      void goToNext();
      return;
    }

    setRestTimer(60);
    setMode('rest');

    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void goToNext();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    setRestInterval(interval);
  };

  const skipRest = () => {
    if (restInterval) clearInterval(restInterval);
    void goToNext();
  };

  if (contentLoading || !dayContent) {
    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center p-4">
        <div className="max-w-[430px] w-full text-center">
          {contentLoading ? (
            <>
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Загрузка дня...</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-3">
                {contentError || 'Контент этого дня пока недоступен'}
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

  const config = TYPE_CONFIG[dayContent.type] || TYPE_CONFIG.workout;
  const overviewDayNumber = dayContent.day_number || currentDay;
  const hasTasks = dayContent.exercises.some((exercise) => exercise.type === 'task');
  const startButtonText = hasTasks ? 'Начать день' : 'Запустить тренировку';

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

            <h1 className="text-lg font-bold">{programTitle}</h1>

            <div className="w-10" />
          </div>

          <div className="bg-surface rounded-2xl p-5 border border-white/5 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{config.icon}</span>

              <div>
                <p className="text-gray-400 text-sm">
                  День {overviewDayNumber} из 30
                </p>

                <h2 className="text-xl font-bold">{dayContent.title}</h2>
              </div>
            </div>

            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            {dayContent.exercises.map((exercise, index) => {
              const isTask = exercise.type === 'task';

              return (
                <div
                  key={`${exercise.name}-${index}`}
                  className="bg-surface rounded-xl p-4 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-accent font-bold text-sm">
                        {index + 1}
                      </span>
                    </div>

                    <p className="font-medium leading-snug">{exercise.name}</p>
                  </div>

                  <div className="text-right shrink-0">
                    {isTask ? (
                      <p className="text-blue-400 font-semibold text-sm">
                        Задание
                      </p>
                    ) : (
                      <>
                        <p className="text-accent font-semibold">
                          {exercise.reps}
                        </p>
                        <p className="text-gray-500 text-xs">
                          ×{exercise.sets || 1}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {dayContent.type !== 'rest' ? (
            <button
              onClick={startWorkout}
              className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Play size={22} />
              {startButtonText}
            </button>
          ) : (
            <button
              onClick={() => void onCompleteDay()}
              disabled={isCompleting}
              className="w-full py-4 bg-surface rounded-xl font-semibold text-gray-400 text-lg active:scale-95 transition-all border border-white/10 disabled:opacity-50 disabled:active:scale-100"
            >
              {isCompleting ? 'Сохраняем...' : 'Отдыхаю'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'exercise' && currentExercise) {
    const isTask = currentExercise.type === 'task';
    const timerSeconds = getSecondsFromReps(currentExercise.reps);
    const descriptionText = exerciseInfo?.description || exerciseInfo?.tips;

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

          {!isTask && (
            <div className="text-center mb-4">
              <span className="text-xs text-gray-500 bg-surface px-3 py-1 rounded-full">
                Подход {currentExercise.setNumber} из {currentExercise.totalSets}
              </span>
            </div>
          )}

          {exerciseInfo?.youtube_id ? (
            <div
              className="rounded-2xl overflow-hidden mb-4 bg-black"
              style={{ aspectRatio: '16/9' }}
            >
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${exerciseInfo.youtube_id}?rel=0&modestbranding=1`}
                title={currentExercise.name}
                frameBorder="0"
                allowFullScreen
              />
            </div>
          ) : isTask ? (
            <div
              className="rounded-2xl bg-surface border border-white/5 mb-4 flex items-center justify-center"
              style={{ aspectRatio: '16/9' }}
            >
              <div className="text-center px-6">
                <p className="text-6xl mb-3">✅</p>
                <p className="text-gray-400 text-sm">
                  Просто выполни это действие и отметь его.
                </p>
              </div>
            </div>
          ) : programCode === 'running' ? (
            <div
              className="rounded-2xl bg-surface border border-white/5 mb-4 flex items-center justify-center"
              style={{ aspectRatio: '16/9' }}
            >
              <div className="text-center px-6">
                <p className="text-gray-500 text-5xl mb-3">🏃</p>
                <p className="text-gray-400 text-sm">
                  Видео для этого интервала пока недоступно
                </p>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl bg-surface border border-white/5 mb-4 flex items-center justify-center"
              style={{ aspectRatio: '16/9' }}
            >
              <p className="text-gray-500 text-4xl">💪</p>
            </div>
          )}

          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-1">{currentExercise.name}</h2>

            {!isTask && (
              <>
                <p className="text-4xl font-bold text-accent">
                  {currentExercise.reps}
                </p>

                <p className="text-gray-400 text-sm mt-1">
                  {typeof currentExercise.reps === 'string' &&
                  (currentExercise.reps.includes('мин') ||
                    currentExercise.reps.includes('сек'))
                    ? ''
                    : 'повторений'}
                </p>
              </>
            )}
          </div>

          {descriptionText && (
            <div className="bg-accent/10 rounded-xl p-3 border border-accent/20 mb-4">
              <p className="text-xs text-accent mb-1">
                {isTask ? 'Описание задания' : 'Описание / техника'}
              </p>
              <p className="text-sm text-gray-300">{descriptionText}</p>
            </div>
          )}

          {!isTask && exerciseInfo?.tips && exerciseInfo?.description && (
            <div className="bg-surface rounded-xl p-3 border border-white/5 mb-4">
              <p className="text-xs text-gray-500 mb-1">Совет</p>
              <p className="text-sm text-gray-300">{exerciseInfo.tips}</p>
            </div>
          )}

          {!isTask && exerciseInfo?.muscles && (
            <div className="bg-surface rounded-xl p-3 border border-white/5 mb-4">
              <p className="text-xs text-gray-500">
                Работают:{' '}
                <span className="text-accent">{exerciseInfo.muscles}</span>
              </p>
            </div>
          )}

          {!isTask && timerSeconds && <ExerciseTimer seconds={timerSeconds} />}

          <button
            onClick={completeExercise}
            className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all"
          >
            {isTask ? '✅ Выполнил задание!' : '✅ Выполнил!'}
          </button>

          {nextExercise && (
            <p className="text-center text-gray-500 text-sm mt-3">
              Следующее:{' '}
              <span className="text-white">{nextExercise.name}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'rest') {
    const nextIsTask = nextExercise?.type === 'task';

    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center">
        <div className="max-w-[430px] w-full mx-auto p-4 text-center">
          <p className="text-gray-400 text-lg mb-4">Отдых</p>

          <div className="w-40 h-40 rounded-full border-4 border-accent flex items-center justify-center mx-auto mb-6">
            <div>
              <p className="text-5xl font-bold text-accent">{restTimer}</p>
              <p className="text-gray-400 text-sm">сек</p>
            </div>
          </div>

          {nextExercise && (
            <div className="bg-surface rounded-xl p-4 border border-white/5 mb-6">
              <p className="text-gray-400 text-sm mb-1">
                {nextIsTask ? 'Следующее задание' : 'Следующее упражнение'}
              </p>

              <p className="text-xl font-bold">{nextExercise.name}</p>

              {!nextIsTask && (
                <p className="text-accent">{nextExercise.reps}</p>
              )}
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
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center">
        <div className="max-w-[430px] w-full mx-auto p-4 text-center">
          <p className="text-8xl mb-6">🏆</p>

          <h2 className="text-3xl font-bold mb-2">День завершён!</h2>

          <p className="text-gray-400 mb-2">
            День {overviewDayNumber} выполнен
          </p>

          <p className="text-accent font-semibold mb-8">
            +{programCode === 'running' && overviewDayNumber === 30 ? 500 : 25} XP
          </p>

          {completionError && (
            <p className="text-red-400 text-sm mb-4">{completionError}</p>
          )}

          <div className="bg-surface rounded-xl p-4 border border-white/5 mb-6">
            <p className="text-gray-400 text-sm">Выполнено заданий</p>
            <p className="text-3xl font-bold text-accent">{queue.length}</p>
          </div>

          <button
            onClick={() => void onCompleteDay()}
            disabled={isCompleting}
            className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {isCompleting ? 'Сохраняем...' : '✅ Отметить день выполненным'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
