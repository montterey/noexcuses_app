import { X, Play, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Exercise {
  name: string;
  sets: number;
  reps: string | number;
}

interface DayContent {
  day_number: number;
  title: string;
  type: 'workout' | 'cardio' | 'rest' | 'stretch';
  exercises: Exercise[];
}

interface ProgramDetailProps {
  programTitle: string;
  currentDay: number;
  dayContent: DayContent | null;
  onClose: () => void;
  onCompleteDay: () => void;
}

const TYPE_CONFIG = {
  workout: { icon: '💪', color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Силовая' },
  cardio: { icon: '🏃', color: 'text-red-400', bg: 'bg-red-400/10', label: 'Кардио' },
  rest: { icon: '😴', color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Отдых' },
  stretch: { icon: '🧘', color: 'text-green-400', bg: 'bg-green-400/10', label: 'Растяжка' },
};

// Разворачиваем упражнения в круговой порядок
function buildWorkoutQueue(exercises: Exercise[]): { name: string; reps: string | number; setNumber: number; totalSets: number }[] {
  const queue = [];
  const maxSets = Math.max(...exercises.map(e => e.sets));
  for (let set = 1; set <= maxSets; set++) {
    for (const exercise of exercises) {
      if (set <= exercise.sets) {
        queue.push({
          name: exercise.name,
          reps: exercise.reps,
          setNumber: set,
          totalSets: exercise.sets,
        });
      }
    }
  }
  return queue;
}

type WorkoutMode = 'overview' | 'exercise' | 'rest' | 'complete';

export function ProgramDetail({ programTitle, currentDay, dayContent, onClose, onCompleteDay }: ProgramDetailProps) {
  const [mode, setMode] = useState<WorkoutMode>('overview');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exerciseInfo, setExerciseInfo] = useState<any>(null);
  const [restTimer, setRestTimer] = useState(60);
  const [restInterval, setRestInterval] = useState<any>(null);

  const queue = dayContent ? buildWorkoutQueue(dayContent.exercises) : [];
  const currentExercise = queue[currentIndex];
  const nextExercise = queue[currentIndex + 1];
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  const startWorkout = async () => {
    setCurrentIndex(0);
    setMode('exercise');
    await loadExerciseInfo(queue[0]?.name);
  };

  const loadExerciseInfo = async (name: string) => {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('name', name)
      .single();
    setExerciseInfo(data || null);
  };

  const completeExercise = () => {
    if (currentIndex + 1 >= queue.length) {
      setMode('complete');
      return;
    }
    // Запускаем отдых
    setRestTimer(60);
    setMode('rest');
    const interval = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          goToNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setRestInterval(interval);
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
    await loadExerciseInfo(queue[next]?.name);
  };

  const skipRest = () => {
    if (restInterval) clearInterval(restInterval);
    goToNext();
  };

  if (!dayContent) return null;
  const config = TYPE_CONFIG[dayContent.type];

  // ОБЗОР ДНЯ
  if (mode === 'overview') {
    return (
      <div className="fixed inset-0 bg-dark z-50 overflow-y-auto">
        <div className="max-w-[430px] mx-auto p-4 pb-8">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
              <X size={20} className="text-gray-400" />
            </button>
            <h1 className="text-lg font-bold">{programTitle}</h1>
            <div className="w-10" />
          </div>

          <div className="bg-surface rounded-2xl p-5 border border-white/5 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{config.icon}</span>
              <div>
                <p className="text-gray-400 text-sm">День {dayContent.day_number} из 30</p>
                <h2 className="text-xl font-bold">{dayContent.title}</h2>
              </div>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${config.bg} ${config.color}`}>
              {config.label}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            {dayContent.exercises.map((exercise, index) => (
              <div key={index} className="bg-surface rounded-xl p-4 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <span className="text-accent font-bold text-sm">{index + 1}</span>
                  </div>
                  <p className="font-medium">{exercise.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-accent font-semibold">{exercise.reps}</p>
                  <p className="text-gray-500 text-xs">{exercise.sets} подх.</p>
                </div>
              </div>
            ))}
          </div>

          {dayContent.type !== 'rest' ? (
            <button
              onClick={startWorkout}
              className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Play size={22} />
              Запустить тренировку
            </button>
          ) : (
            <button
              onClick={onCompleteDay}
              className="w-full py-4 bg-surface rounded-xl font-semibold text-gray-400 text-lg active:scale-95 transition-all border border-white/10"
            >
              Отдыхаю 😴
            </button>
          )}
        </div>
      </div>
    );
  }

  // УПРАЖНЕНИЕ
  if (mode === 'exercise' && currentExercise) {
    return (
      <div className="fixed inset-0 bg-dark z-50 overflow-y-auto">
        <div className="max-w-[430px] mx-auto p-4 pb-8">
          <div className="flex items-center justify-between mb-4 pt-2">
            <button onClick={() => setMode('overview')} className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
              <X size={20} className="text-gray-400" />
            </button>
            <p className="text-sm text-gray-400">{currentIndex + 1} из {queue.length}</p>
            <div className="w-10" />
          </div>

          {/* Прогресс */}
          <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-4">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          {/* Подход */}
          <div className="text-center mb-4">
            <span className="text-xs text-gray-500 bg-surface px-3 py-1 rounded-full">
              Подход {currentExercise.setNumber} из {currentExercise.totalSets}
            </span>
          </div>

          {/* Видео */}
          {exerciseInfo?.youtube_id ? (
            <div className="rounded-2xl overflow-hidden mb-4 bg-black" style={{ aspectRatio: '16/9' }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${exerciseInfo.youtube_id}?rel=0&modestbranding=1`}
                title={currentExercise.name}
                frameBorder="0"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-surface border border-white/5 mb-4 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
              <p className="text-gray-500 text-4xl">💪</p>
            </div>
          )}

          {/* Название и повторения */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-1">{currentExercise.name}</h2>
            <p className="text-4xl font-bold text-accent">{currentExercise.reps}</p>
            <p className="text-gray-400 text-sm mt-1">повторений</p>
          </div>

          {/* Советы */}
          {exerciseInfo?.tips && (
            <div className="bg-accent/10 rounded-xl p-3 border border-accent/20 mb-4">
              <p className="text-xs text-accent mb-1">💡 Техника</p>
              <p className="text-sm text-gray-300">{exerciseInfo.tips}</p>
            </div>
          )}

          {/* Мышцы */}
          {exerciseInfo?.muscles && (
            <div className="bg-surface rounded-xl p-3 border border-white/5 mb-4">
              <p className="text-xs text-gray-500">Работают: <span className="text-accent">{exerciseInfo.muscles}</span></p>
            </div>
          )}

          {/* Таймер для упражнений на время */}
          {typeof currentExercise.reps === 'string' && currentExercise.reps.includes('сек') && (
            <ExerciseTimer seconds={parseInt(currentExercise.reps)} onComplete={completeExercise} />
          )}

          {/* Кнопка выполнил */}
          <button
            onClick={completeExercise}
            className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all"
          >
            ✅ Выполнил!
          </button>
          
          {/* Следующее */}
          {nextExercise && (
            <p className="text-center text-gray-500 text-sm mt-3">
              Следующее: <span className="text-white">{nextExercise.name}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ОТДЫХ
  if (mode === 'rest') {
    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center">
        <div className="max-w-[430px] w-full mx-auto p-4 text-center">
          <p className="text-gray-400 text-lg mb-4">😮‍💨 Отдых</p>
          <div className="w-40 h-40 rounded-full border-4 border-accent flex items-center justify-center mx-auto mb-6">
            <div>
              <p className="text-5xl font-bold text-accent">{restTimer}</p>
              <p className="text-gray-400 text-sm">сек</p>
            </div>
          </div>

          {nextExercise && (
            <div className="bg-surface rounded-xl p-4 border border-white/5 mb-6">
              <p className="text-gray-400 text-sm mb-1">Следующее упражнение</p>
              <p className="text-xl font-bold">{nextExercise.name}</p>
              <p className="text-accent">{nextExercise.reps} повторений</p>
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

  // ЗАВЕРШЕНО
  if (mode === 'complete') {
    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center">
        <div className="max-w-[430px] w-full mx-auto p-4 text-center">
          <p className="text-8xl mb-6">🏆</p>
          <h2 className="text-3xl font-bold mb-2">Тренировка завершена!</h2>
          <p className="text-gray-400 mb-2">День {dayContent.day_number} выполнен</p>
          <p className="text-accent font-semibold mb-8">+25 XP</p>

          <div className="bg-surface rounded-xl p-4 border border-white/5 mb-6">
            <p className="text-gray-400 text-sm">Выполнено упражнений</p>
            <p className="text-3xl font-bold text-accent">{queue.length}</p>
          </div>

          <button
            onClick={onCompleteDay}
            className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all"
          >
            ✅ Отметить день выполненным
          </button>
        </div>
      </div>
    );
  }

  return null;
}
