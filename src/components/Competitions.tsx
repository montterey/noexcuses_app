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
  ChallengeMode,
  ChallengeScope,
  ChallengeStatus,
  ChallengeVisibility,
  CreateChallengeInput,
  UserChallengeListItem,
} from '../types';
import {
  GlowCard,
  PrimaryButton,
  SegmentedControl,
} from './ui/Primitives';

type CompetitionSection = 'catalog' | 'mine' | 'create';

const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  fitness: 'Фитнес',
  running: 'Бег',
  sleep: 'Сон',
  reading: 'Чтение',
  goals: 'Цели',
  programs: 'Программы',
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
  pending: 'Заявка',
  approved: 'Готов к старту',
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
  const config = {
    active: { bg: 'bg-green-500/10', border: 'border-green-500/25', text: 'text-green-300' },
    completed: { bg: 'bg-accent/10', border: 'border-accent/25', text: 'text-red-300' },
    cancelled: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-zinc-500' },
    expired: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-zinc-500' },
    open: { bg: 'bg-cyan-400/10', border: 'border-cyan-400/25', text: 'text-cyan-300' },
    full: { bg: 'bg-amber-400/10', border: 'border-amber-400/25', text: 'text-amber-300' },
  }[status];

  return (
    <span className={`px-2 py-1 rounded-md border text-[10px] font-semibold ${config.bg} ${config.border} ${config.text}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function LoadingBlocks() {
  return (
    <div className="space-y-3" aria-label="Загрузка соревнований">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-36 rounded-xl bg-surface animate-pulse border border-white/5" />
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-14 text-center">
      <Trophy size={36} className="mx-auto mb-3 text-zinc-700" />
      <p className="font-semibold text-zinc-300">{title}</p>
      <p className="mt-1.5 text-sm text-zinc-600 max-w-[280px] mx-auto">{text}</p>
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
    <GlowCard className="p-4" tone="red">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
            {CATEGORY_LABELS[challenge.category]}
          </p>
          <h3 className="display-heading mt-0.5 text-lg leading-tight text-zinc-100">
            {challenge.title}
          </h3>
        </div>
        <StatusBadge status={challenge.challengeStatus} />
      </div>

      {challenge.description && (
        <p className="text-[11px] text-zinc-500 leading-relaxed mb-3 line-clamp-2">
          {challenge.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500 mb-4">
        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
          <Trophy size={11} className="text-zinc-600" />
          {MODE_LABELS[challenge.mode]}
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
          <Clock3 size={11} className="text-zinc-600" />
          {challenge.durationDays} дн.
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
          <Users size={11} className="text-zinc-600" />
          {challenge.participantCount}/{challenge.maxParticipants}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <UserRound size={12} />
          <span className="truncate">{creator}</span>
        </div>
        <button
          type="button"
          onClick={onJoin}
          disabled={busy || challenge.availablePlaces <= 0}
          className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold disabled:opacity-50 active:scale-95 transition-all shadow-red-soft"
        >
          {busy ? 'Вступаем...' : 'Вступить'}
        </button>
      </div>
    </GlowCard>
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
    <GlowCard
      className="p-4"
      tone={challenge.challengeStatus === 'active' ? 'green' : challenge.challengeStatus === 'completed' ? 'red' : 'red'}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
            {CATEGORY_LABELS[challenge.category]}
          </p>
          <h3 className="display-heading mt-0.5 text-lg leading-tight text-zinc-100">
            {challenge.title}
          </h3>
        </div>
        <StatusBadge status={challenge.challengeStatus} />
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] mb-3">
        <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-zinc-400">
          {MODE_LABELS[challenge.mode]}
        </span>
        <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-zinc-400">
          Прогресс: {challenge.progress}
        </span>
        {date && (
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-zinc-500">
            {date}
          </span>
        )}
      </div>

      <p className="text-[10px] text-zinc-600 mb-3">
        Участие: {PARTICIPANT_LABELS[challenge.participantStatus]}
      </p>

      {challenge.result !== 'pending' && (
        <p className="text-sm font-semibold text-accent mb-3">
          {challenge.result === 'winner'
            ? 'Победа'
            : challenge.result === 'draw'
              ? 'Ничья'
              : 'Участие завершено'}
        </p>
      )}

      {isInvitation && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold disabled:opacity-50 shadow-red-soft"
          >
            <Check size={14} /> Принять
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-white/10 bg-surface-light text-zinc-400 text-xs font-semibold disabled:opacity-50"
          >
            <X size={14} /> Отклонить
          </button>
        </div>
      )}

      {canCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="w-full mt-3 py-2.5 rounded-lg border border-red-400/25 text-red-300 text-xs font-semibold disabled:opacity-50"
        >
          Отменить соревнование
        </button>
      )}
    </GlowCard>
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
      setValidationError('ID приглашённого должен быть корректным UUID');
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

  const inputClass = 'w-full rounded-lg border border-white/10 bg-surface px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30';
  const selectClass = 'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-zinc-100 focus:border-accent focus:outline-none cursor-pointer';

  return (
    <div className="safe-area-top overflow-x-hidden px-4 pb-24 pt-4">
      <header className="mb-6">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-red-soft" />
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent">Соревнования</p>
        </div>
        <h1 className="display-heading text-[1.625rem] leading-tight text-zinc-100">Каталог</h1>
        <p className="mt-1 text-xs text-zinc-600">Соревнуйтесь в целях и программах</p>
      </header>

      {/* Tabs */}
      <SegmentedControl
        value={section}
        onChange={setSection}
        className="mt-5 mb-5"
        options={[
          { value: 'catalog', label: 'Каталог' },
          { value: 'mine', label: 'Мои' },
          { value: 'create', label: 'Создать' },
        ]}
      />

      {/* Messages */}
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
          {actionError}
        </div>
      )}
      {validationError && (
        <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
          {validationError}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      {/* Catalog Section */}
      {section === 'catalog' && (
        <section aria-label="Каталог соревнований">
          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск соревнований"
              className={`${inputClass} pl-10`}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as ChallengeCategory | '')}
              className={selectClass}
            >
              <option value="">Все категории</option>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={durationDays}
              onChange={(event) => setDurationDays(event.target.value ? Number(event.target.value) as 1 | 3 | 7 : '')}
              className={selectClass}
            >
              <option value="">Любая длительность</option>
              <option value="1">1 день</option>
              <option value="3">3 дня</option>
              <option value="7">7 дней</option>
            </select>
          </div>

          {/* Sort */}
          <div className="mb-5">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className={`${selectClass} w-full`}
            >
              <option value="newest">Сначала новые</option>
              <option value="popular">Популярные</option>
              <option value="starting_soon">Скоро начинаются</option>
              <option value="recommended">Рекомендуемые</option>
            </select>
          </div>

          {/* Results */}
          {catalogLoading ? (
            <LoadingBlocks />
          ) : catalogError ? (
            <EmptyState title="Ошибка загрузки" text={catalogError} />
          ) : publicChallenges.length === 0 ? (
            <EmptyState title="Ничего не найдено" text="Попробуйте изменить фильтры" />
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

      {/* Mine Section */}
      {section === 'mine' && (
        <section aria-label="Мои соревнования">
          <SegmentedControl
            value={scope}
            onChange={setScope}
            className="mb-5"
            options={[
              { value: 'active', label: 'Активные' },
              { value: 'invitations', label: 'Приглашения' },
              { value: 'history', label: 'История' },
            ]}
          />

          {mineLoading ? (
            <LoadingBlocks />
          ) : mineError ? (
            <EmptyState title="Ошибка загрузки" text={mineError} />
          ) : myChallenges.length === 0 ? (
            <EmptyState
              title={scope === 'invitations' ? 'Нет приглашений' : 'Список пуст'}
              text={scope === 'history' ? 'Завершённые появятся здесь' : 'Выберите в каталоге или создайте своё'}
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

      {/* Create Section */}
      {section === 'create' && (
        <form onSubmit={handleCreate} className="space-y-4" aria-label="Создать соревнование">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Название</span>
            <input
              required
              minLength={3}
              maxLength={120}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={inputClass}
              placeholder="Например, 7 дней дисциплины"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Описание</span>
            <textarea
              maxLength={1000}
              rows={2}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="Коротко о правилах"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Категория</span>
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
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Длительность</span>
              <select
                value={form.durationDays}
                onChange={(event) => setForm({ ...form, durationDays: Number(event.target.value) as 1 | 3 | 7 })}
                className={selectClass}
              >
                <option value="1">1 день</option>
                <option value="3">3 дня</option>
                <option value="7">7 дней</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Что считаем</span>
            <select
              value={form.metricType}
              disabled
              aria-readonly="true"
              className={`${selectClass} opacity-60 cursor-not-allowed`}
            >
              <option value="goals_completed">Выполненные цели</option>
              <option value="program_days_completed">Дни программ</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Режим</span>
            <select
              value={form.mode}
              onChange={(event) => setForm({ ...form, mode: event.target.value as ChallengeMode })}
              className={selectClass}
            >
              <option value="highest_score">Лучший результат</option>
              <option value="first_to_target">Первый до цели</option>
            </select>
          </label>

          {form.mode === 'first_to_target' && (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Целевое значение</span>
              <input
                required
                min="1"
                type="number"
                inputMode="numeric"
                value={form.targetValue}
                onChange={(event) => setForm({ ...form, targetValue: event.target.value })}
                className={inputClass}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Видимость</span>
              <select
                value={form.visibility}
                onChange={(event) => setForm({ ...form, visibility: event.target.value as ChallengeVisibility })}
                className={selectClass}
              >
                <option value="public">Публичное</option>
                <option value="link_only">По ссылке</option>
                <option value="private">Приватное</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Вступление</span>
              <select
                value={form.joinMode}
                onChange={(event) => setForm({ ...form, joinMode: event.target.value as ChallengeJoinMode })}
                className={selectClass}
              >
                <option value="instant">Сразу</option>
                <option value="approval">По заявке</option>
                <option value="invite_only">По приглашению</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">ID приглашённого пользователя</span>
            <input
              required={form.visibility === 'private' || form.joinMode === 'invite_only'}
              value={form.invitedUserId}
              onChange={(event) => setForm({ ...form, invitedUserId: event.target.value })}
              className={inputClass}
              placeholder="Необязательно для публичного"
            />
          </label>

          <PrimaryButton
            type="submit"
            disabled={creating}
            className="w-full"
          >
            {creating ? 'Создаём...' : 'Создать соревнование'}
          </PrimaryButton>
        </form>
      )}
    </div>
  );
}
