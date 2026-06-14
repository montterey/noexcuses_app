import { X, Clock } from 'lucide-react';
import { useState } from 'react';

interface ExerciseDetailProps {
  exercise: {
    name: string;
    sets: number;
    reps: string | number;
  };
  exerciseInfo: {
    youtube_id: string | null;
    description: string;
    tips: string;
    muscles: string;
  } | null;
  onClose: () => void;
  onStartTimer: (seconds: number) => void;
}

export function ExerciseDetail({ exercise, exerciseInfo, onClose, onStartTimer }: ExerciseDetailProps) {
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const startTimer = (seconds: number) => {
    setTimeLeft(seconds);
    setTimerActive(true);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-dark z-[60] overflow-y-auto">
      <div className="max-w-[430px] mx-auto p-4 pb-8">
        {/* Хедер */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface flex items-center justify-center"
          >
            <X size={20} className="text-gray-400" />
          </button>
          <h1 className="text-lg font-bold">{exercise.name}</h1>
          <div className="w-10" />
        </div>

        {/* Видео */}
        {exerciseInfo?.youtube_id ? (
          <div className="rounded-2xl overflow-hidden mb-4 bg-black" style={{ aspectRatio: '16/9' }}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${exerciseInfo.youtube_id}?rel=0&modestbranding=1`}
              title={exercise.name}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-surface border border-white/5 mb-4 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
            <p className="text-gray-500">Видео недоступно</p>
          </div>
        )}

        {/* Подходы и повторения */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface rounded-xl p-4 border border-white/5 text-center">
            <p className="text-2xl font-bold text-accent">{exercise.sets}</p>
            <p className="text-gray-400 text-sm">подходов</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-white/5 text-center">
            <p className="text-2xl font-bold text-accent">{exercise.reps}</p>
            <p className="text-gray-400 text-sm">повторений</p>
          </div>
        </div>

        {/* Мышцы */}
        {exerciseInfo?.muscles && (
          <div className="bg-surface rounded-xl p-4 border border-white/5 mb-4">
            <p className="text-xs text-gray-500 mb-1">Работают мышцы</p>
            <p className="text-sm font-medium text-accent">{exerciseInfo.muscles}</p>
          </div>
        )}

        {/* Описание */}
        {exerciseInfo?.description && (
          <div className="bg-surface rounded-xl p-4 border border-white/5 mb-4">
            <p className="text-xs text-gray-500 mb-2">Описание</p>
            <p className="text-sm text-gray-300">{exerciseInfo.description}</p>
          </div>
        )}

        {/* Советы */}
        {exerciseInfo?.tips && (
          <div className="bg-accent/10 rounded-xl p-4 border border-accent/20 mb-4">
            <p className="text-xs text-accent mb-2">💡 Советы по технике</p>
            <p className="text-sm text-gray-300">{exerciseInfo.tips}</p>
          </div>
        )}

        {/* Таймер */}
        <div className="bg-surface rounded-xl p-4 border border-white/5">
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock size={16} className="text-accent" />
            Таймер отдыха
          </p>

          {timerActive ? (
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-accent mb-2">{timeLeft}</p>
              <p className="text-gray-400 text-sm">секунд осталось</p>
            </div>
          ) : (
            <div className="flex gap-2">
              {[30, 45, 60, 90].map((sec) => (
                <button
                  key={sec}
                  onClick={() => startTimer(sec)}
                  className="flex-1 py-2 rounded-lg bg-surface-light text-sm font-medium hover:bg-accent/20 hover:text-accent transition-all"
                >
                  {sec}с
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
