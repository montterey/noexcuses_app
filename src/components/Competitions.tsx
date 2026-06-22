import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock3,
  Search,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useChallenges } from '../hooks/useChallenges';
import { isValidUuid, metricForCategory } from '../lib/challengeRules';
import {
  ChallengeCatalogItem,
  ChallengeCategory,
  ChallengeJoinMode,
  ChallengeMetric,
  ChallengeMode,
  ChallengeScope,
  ChallengeStatus,
  ChallengeVisibility,
  CreateChallengeInput,
  UserChallengeListItem,
} from '../types';

type CompetitionSection = 'catalog' | 'mine' | 'create';

const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  fitness: 'Фитнес',
  running: 'Бег',
  sleep: 'Сон',
  reading: 'Чтение',
  goals: 'Цели',
  programs: 'Программы',
};

const METRIC_LABELS: Record<ChallengeMetric, string> = {
  goals_completed: 'Выполненные цели',
  program_days_completed: 'Дни программ',
};

const MODE_LABELS: Record<ChallengeMode, string> = {
  highest_score: 'Лучший результат',
  first_to_target: 'До заданной цели',
};

const STATUS_LABELS: Record<ChallengeStatus, string> = {
  open: 'Открыто',
  full: 'Набрано',
  active: 'Идёт',
  completed: 'Завершено',
  cancelled: 'Отменено',
  expired: 'Истекло',
};

const PARTICIPANT_LABELS: Record<UserChallengeListItem['participantStatus'], string> = {
  invited: 'Приглашение',
  pending: 'Заявка на рассмотрении',
  approved: 'Готово к старту',
  active: 'Участвует',
  rejected: 'Отклонено',
  declined: 'Отказ',
  left: 'Покинул',
  completed: 'Завершил',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as Array<[ChallengeCategory, string]>;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: ChallengeStatus }) {
  const color = status === 'active'
    ? 'text-green-300 bg-green-400/10 border-green-400/20'
    : status === 'completed'
      ? 'text-accent bg-accent/10 border-accent/20'
      : status === 'cancelled' || status === 'expired'
        ? 'text-gray-400 bg-white/5 border-white/10'
        : 'text-blue-300 bg-blue-400/10 border-blue-400/20';

  return (
    <span className={`px-2 py-1 rounded-md border text-[11px] font-medium ${color}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function LoadingBlocks() {
  return (
    <div className="space-y-3" aria-label="Загрузка соревнований">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-40 rounded-lg bg-surface animate-pulse border border-white/5" />
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-14 text-center">
      <Trophy size={36} className="mx-auto mb-3 text-gray-600" />
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm text-gray-500 max-w-[280px] mx-auto">{text}</p>
    </div>
  );
}

function PublicChallengeCard({
  challenge,
  busy,
  onJoin,
}: {
  challenge: ChallengeCatalogItem;
  busy: boolean;
  onJoin: () => void;
}) {
  const creator = challenge.creatorUsername
    ? `@${challenge.creatorUsername}`
    : challenge.creatorFirstName;

  return (
    <article className="rounded-lg bg-surface border border-white/5 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-xs text-accent font-medium mb-1">
            {CATEGORY_LABELS[challenge.category]}
          </p>
          <h3 className="font-bold text-lg leading-tight">{challenge.title}</h3>
        </div>
        <StatusBadge status={challenge.challengeStatus} />
      </div>

      {challenge.description && (
        <p className="text-sm text-gray-400 leading-relaxed mb-3 line-clamp-3">
          {challenge.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1.5">
          <Trophy size={14} className="text-gray-500" />
          {MODE_LABELS[challenge.mode]}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 size={14} className="text-gray-500" />
          {challenge.durationDays} дн.
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} className="text-gray-500" />
          {challenge.participantCount}/{challenge.maxParticipants}
        </span>
        <span className="flex items-center gap-1.5 min-w-0">
          <UserRound size={14} className="text-gray-500 shrink-0" />
          <span className="truncate">{creator}</span>
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
        <span className="text-xs text-gray-500">{METRIC_LABELS[challenge.metricType]}</span>
        <button
          type="button"
          onClick={onJoin}
          disabled={busy || challenge.availablePlaces <= 0}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
        >
          {busy ? 'Вступаем...' : 'Присоединиться'}
        </button>
      </div>
    </article>
  );
}

function MyChallengeCard({
  challenge,
  busy,
  onAccept,
  onDecline,
  onCancel,
}: {
  challenge: UserChallengeListItem;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const isInvitation = challenge.participantStatus === 'invited';
  const canCancel = challenge.isCreator
    && (challenge.challengeStatus === 'open' || challenge.challengeStatus === 'full');
  const date = challenge.challengeStatus === 'completed'
    ? formatDate(challenge.endsAt)
    : formatDate(challenge.startsAt);

  return (
    <article className="rounded-lg bg-surface border border-white/5 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-accent font-medium mb-1">
            {CATEGORY_LABELS[challenge.category]}
          </p>
          <h3 className="font-bold text-lg leading-tight">{challenge.title}</h3>
        </div>
        <StatusBadge status={challenge.challengeStatus} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
        <span>{MODE_LABELS[challenge.mode]}</span>
        <span>{METRIC_LABELS[challenge.metricType]}</span>
        <span>Прогресс: {challenge.progress}</span>
        {date && <span>{date}</span>}
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Статус участия: {PARTICIPANT_LABELS[challenge.participantStatus]}
      </p>

      {challenge.result !== 'pending' && (
        <p className="text-sm text-accent mb-3">
          {challenge.result === 'winner'
            ? 'Победа'
            : challenge.result === 'draw'
              ? 'Ничья'
              : 'Участие завершено'}
        </p>
      )}

      {isInvitation && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="py-2.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check size={16} /> Принять
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={busy}
            className="py-2.5 rounded-lg bg-surface-light text-gray-300 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <X size={16} /> Отклонить
          </button>
        </div>
      )}

      {canCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="w-full mt-3 py-2 rounded-lg border border-red-400/20 text-red-300 text-sm disabled:opacity-50"
        >
          Отменить соревнование
        </button>
      )}
    </article>
  );
}

export function Competitions() {
  const [section, setSection] = useState<CompetitionSection>('catalog');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ChallengeCategory | ''>('');
  const [durationDays, setDurationDays] = useState<1 | 3 | 7 | ''>('');
  const [sort, setSort] = useState<'newest' | 'popular' | 'starting_soon' | 'recommended'>('newest');
  const [scope, setScope] = useState<Exclude<ChallengeScope, 'all'>>('active');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'goals' as ChallengeCategory,
    metricType: metricForCategory('goals'),
    mode: 'highest_score' as ChallengeMode,
    targetValue: '',
    durationDays: 3 as 1 | 3 | 7,
    visibility: 'public' as ChallengeVisibility,
    joinMode: 'instant' as ChallengeJoinMode,
    invitedUserId: '',
  });

  const {
    publicChallenges,
    myChallenges,
    catalogLoading,
    mineLoading,
    catalogError,
    mineError,
    actionError,
    actingId,
    creating,
    loadPublic,
    loadMine,
    join,
    respond,
    cancel,
    create,
    clearActionError,
  } = useChallenges();

  const catalogFilters = useMemo(() => ({
    search: search.trim() || undefined,
    category: category || undefined,
    durationDays: durationDays || undefined,
    sort,
    pageSize: 30,
  }), [search, category, durationDays, sort]);

  useEffect(() => {
    if (section !== 'catalog') return;
    const timer = window.setTimeout(() => void loadPublic(catalogFilters), 250);
    return () => window.clearTimeout(timer);
  }, [section, catalogFilters, loadPublic]);

  useEffect(() => {
    if (section === 'mine') void loadMine(scope);
  }, [section, scope, loadMine]);

  const refreshAfterAction = async () => {
    await Promise.all([loadPublic(catalogFilters), loadMine(scope)]);
  };

  const handleJoin = async (challengeId: string) => {
    if (await join(challengeId)) await refreshAfterAction();
  };

  const handleResponse = async (
    challengeId: string,
    responseAction: 'accept_invite' | 'decline_invite'
  ) => {
    if (await respond(challengeId, responseAction)) await loadMine(scope);
  };

  const handleCancel = async (challengeId: string) => {
    if (await cancel(challengeId)) await loadMine(scope);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
    setValidationError(null);
    clearActionError();

    const invitedUserId = form.invitedUserId.trim();
    if (invitedUserId && !isValidUuid(invitedUserId)) {
      setValidationError('ID приглашённого пользователя должен быть корректным UUID');
      return;
    }

    const input: CreateChallengeInput = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      metricType: metricForCategory(form.category),
      mode: form.mode,
      targetValue: form.mode === 'first_to_target' ? Number(form.targetValue) : undefined,
      durationDays: form.durationDays,
      visibility: form.visibility,
      joinMode: form.joinMode,
      invitedUserId: invitedUserId || undefined,
    };

    const result = await create(input);
    if (!result.success) return;

    setSuccessMessage('Соревнование создано');
    setForm((current) => ({ ...current, title: '', description: '', targetValue: '', invitedUserId: '' }));
    setScope('active');
    setSection('mine');
    await loadMine('active');
  };

  const selectClass = 'w-full bg-surface border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-accent';
  const inputClass = 'w-full bg-surface border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-accent box-border';

  return (
    <div className="px-4 pt-5 pb-24 overflow-x-hidden">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Соревнования</h1>
        <p className="text-sm text-gray-400 mt-1">Соревнуйтесь в целях и программах</p>
      </header>

      <div className="grid grid-cols-3 bg-surface rounded-lg p-1 mb-5">
        {([
          ['catalog', 'Каталог'],
          ['mine', 'Мои'],
          ['create', 'Создать'],
        ] as Array<[CompetitionSection, string]>).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSection(id);
              setSuccessMessage(null);
              setValidationError(null);
              clearActionError();
            }}
            className={`py-2 rounded-md text-sm font-medium transition-colors ${
              section === id ? 'bg-accent text-white' : 'text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {actionError}
        </div>
      )}
      {validationError && (
        <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {validationError}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      {section === 'catalog' && (
        <section aria-label="Каталог соревнований">
          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск соревнований"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <select value={category} onChange={(event) => setCategory(event.target.value as ChallengeCategory | '')} className={selectClass}>
              <option value="">Все категории</option>
              {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={durationDays} onChange={(event) => setDurationDays(event.target.value ? Number(event.target.value) as 1 | 3 | 7 : '')} className={selectClass}>
              <option value="">Любая длительность</option>
              <option value="1">1 день</option>
              <option value="3">3 дня</option>
              <option value="7">7 дней</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className={`${selectClass} col-span-2`}>
              <option value="newest">Сначала новые</option>
              <option value="popular">Популярные</option>
              <option value="starting_soon">Скоро начинаются</option>
              <option value="recommended">Рекомендуемые</option>
            </select>
          </div>

          {catalogLoading ? <LoadingBlocks /> : catalogError ? (
            <EmptyState title="Не удалось загрузить каталог" text={catalogError} />
          ) : publicChallenges.length === 0 ? (
            <EmptyState title="Ничего не найдено" text="Попробуйте изменить поиск или фильтры" />
          ) : (
            <div className="space-y-3">
              {publicChallenges.map((challenge) => (
                <PublicChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  busy={actingId === challenge.id}
                  onJoin={() => void handleJoin(challenge.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {section === 'mine' && (
        <section aria-label="Мои соревнования">
          <div className="grid grid-cols-3 gap-1 bg-surface rounded-lg p-1 mb-4">
            {([
              ['active', 'Активные'],
              ['invitations', 'Приглашения'],
              ['history', 'История'],
            ] as Array<[Exclude<ChallengeScope, 'all'>, string]>).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setScope(id)}
                className={`py-2 rounded-md text-[11px] font-medium ${scope === id ? 'bg-surface-light text-white' : 'text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mineLoading ? <LoadingBlocks /> : mineError ? (
            <EmptyState title="Не удалось загрузить список" text={mineError} />
          ) : myChallenges.length === 0 ? (
            <EmptyState
              title={scope === 'invitations' ? 'Нет приглашений' : 'Список пуст'}
              text={scope === 'history' ? 'Завершённые соревнования появятся здесь' : 'Выберите соревнование в каталоге или создайте своё'}
            />
          ) : (
            <div className="space-y-3">
              {myChallenges.map((challenge) => (
                <MyChallengeCard
                  key={challenge.challengeId}
                  challenge={challenge}
                  busy={actingId === challenge.challengeId}
                  onAccept={() => void handleResponse(challenge.challengeId, 'accept_invite')}
                  onDecline={() => void handleResponse(challenge.challengeId, 'decline_invite')}
                  onCancel={() => void handleCancel(challenge.challengeId)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {section === 'create' && (
        <form onSubmit={handleCreate} className="space-y-4" aria-label="Создать соревнование">
          <label className="block">
            <span className="block text-sm text-gray-300 mb-1.5">Название</span>
            <input required minLength={3} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Например, 7 дней дисциплины" />
          </label>
          <label className="block">
            <span className="block text-sm text-gray-300 mb-1.5">Описание</span>
            <textarea maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} resize-none`} placeholder="Коротко опишите правила" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="block text-sm text-gray-300 mb-1.5">Категория</span>
              <select
                value={form.category}
                onChange={(event) => {
                  const nextCategory = event.target.value as ChallengeCategory;
                  setForm({
                    ...form,
                    category: nextCategory,
                    metricType: metricForCategory(nextCategory),
                  });
                }}
                className={selectClass}
              >
                {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span className="block text-sm text-gray-300 mb-1.5">Длительность</span>
              <select value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: Number(event.target.value) as 1 | 3 | 7 })} className={selectClass}>
                <option value="1">1 день</option><option value="3">3 дня</option><option value="7">7 дней</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="block text-sm text-gray-300 mb-1.5">Что считаем</span>
            <select
              value={form.metricType}
              disabled
              aria-readonly="true"
              className={`${selectClass} opacity-70 cursor-not-allowed`}
            >
              <option value="goals_completed">Выполненные цели</option>
              <option value="program_days_completed">Дни программ</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm text-gray-300 mb-1.5">Режим</span>
            <select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as ChallengeMode })} className={selectClass}>
              <option value="highest_score">Лучший результат</option>
              <option value="first_to_target">Первый до цели</option>
            </select>
          </label>
          {form.mode === 'first_to_target' && (
            <label className="block">
              <span className="block text-sm text-gray-300 mb-1.5">Целевое значение</span>
              <input required min="1" type="number" inputMode="numeric" value={form.targetValue} onChange={(event) => setForm({ ...form, targetValue: event.target.value })} className={inputClass} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="block text-sm text-gray-300 mb-1.5">Видимость</span>
              <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ChallengeVisibility })} className={selectClass}>
                <option value="public">Публичное</option><option value="link_only">По ссылке</option><option value="private">Приватное</option>
              </select>
            </label>
            <label>
              <span className="block text-sm text-gray-300 mb-1.5">Вступление</span>
              <select value={form.joinMode} onChange={(event) => setForm({ ...form, joinMode: event.target.value as ChallengeJoinMode })} className={selectClass}>
                <option value="instant">Сразу</option><option value="approval">По заявке</option><option value="invite_only">По приглашению</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="block text-sm text-gray-300 mb-1.5">ID приглашённого пользователя</span>
            <input
              required={form.visibility === 'private' || form.joinMode === 'invite_only'}
              value={form.invitedUserId}
              onChange={(event) => setForm({ ...form, invitedUserId: event.target.value })}
              className={inputClass}
              placeholder="Необязательно для публичного"
            />
          </label>
          <button type="submit" disabled={creating} className="w-full py-3.5 rounded-lg bg-accent text-white font-semibold disabled:opacity-50 active:scale-[0.98] transition-all">
            {creating ? 'Создаём...' : 'Создать соревнование'}
          </button>
        </form>
      )}
    </div>
  );
}
