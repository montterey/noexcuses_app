import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ExerciseDetail } from './ExerciseDetail';
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

export function ProgramDetail({ programTitle, currentDay, dayContent, onClose, onCompleteDay }: ProgramDetailProps) {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseInfo, setExerciseInfo] = useState<any>(null);

  const openExercise = async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('name', exercise.name)
      .single();
    setExerciseInfo(data || null);
  };

  if (!dayContent) {
    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center">
        <p className="text-gray-400">Загрузка...</p>
      </div>
    );
  }

  const config = TYPE_CONFIG[dayContent.type];

  return (
    <>
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
              <button
                key={index}
                onClick={() => openExercise(exercise)}
                className="w-full bg-surface rounded-xl p-4 border border-white/5 flex items-center justify-between active:scale-95 transition-all hover:border-accent/30"
              >
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
              </button>
            ))}
          </div>

          {dayContent.type !== 'rest' ? (
            <button
              onClick={onCompleteDay}
              className="w-full py-4 bg-accent rounded-xl font-semibold text-white text-lg active:scale-95 transition-all"
            >
              ✅ День выполнен!
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

      {selectedExercise && (
        <ExerciseDetail
          exercise={selectedExercise}
          exerciseInfo={exerciseInfo}
          onClose={() => { setSelectedExercise(null); setExerciseInfo(null); }}
          onStartTimer={(seconds) => {}}
        />
      )}
    </>
  );
}
