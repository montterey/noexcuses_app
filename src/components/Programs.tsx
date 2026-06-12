import { ChevronRight } from 'lucide-react';
import { Program } from '../types';

interface ProgramsProps {
  programs: Program[];
  onStartProgram: (programId: string) => void;
}

export function Programs({ programs, onStartProgram }: ProgramsProps) {
  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Программы</h1>
        <p className="text-gray-400 text-sm">30-дневные челленджи для преображения</p>
      </div>

      <div className="space-y-4">
        {programs.map((program) => {
          const progress = program.isActive ? (program.currentDay / program.totalDays) * 100 : 0;

          return (
            <div
              key={program.id}
              className="bg-surface rounded-2xl p-5 border border-white/5"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-surface-light flex items-center justify-center text-2xl">
                  {program.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{program.title}</h3>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{program.description}</p>
                </div>
              </div>

              {program.isActive && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Прогресс</span>
                    <span className="text-sm font-medium">
                      День {program.currentDay}/{program.totalDays}
                    </span>
                  </div>
                  <div className="h-2 bg-dark-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent-400 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => onStartProgram(program.id)}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  program.isActive
                    ? 'bg-surface-light text-white hover:bg-surface-lighter'
                    : 'bg-accent text-white hover:bg-accent-600'
                }`}
              >
                {program.isActive ? 'Продолжить' : 'Начать'}
                <ChevronRight size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
