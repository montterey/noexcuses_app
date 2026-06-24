import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Flame,
  Plus,
  Search,
  Trophy,
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
import { PrimaryButton, UnderlineTabs } from './ui/Primitives';

type MainTab = 'challenges' | 'rankings' | 'invitations';

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
  first_to_target: 'До цели',
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
  approved: 'Готов',
  active: 'Участвует',
  rejected: 'Отклонено',
  declined: 'Отказ',
  left: 'Покинул',
  completed: 'Завершил',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as Array<[ChallengeCategory, string]>;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function ChallengeStatusBadge({ status }: { status: ChallengeStatus }) {
  const cfg = {
    active: 'text-green-300 bg-green-500/10 border-green-500/25',
    completed: 'text-red-300 bg-accent/10 border-accent/25',
    cancelled: 'text-zinc-500 bg-white/5 border-white/10',
    expired: 'text-zinc-500 bg-white/5 border-white/10',
    open: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/25',
    full: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
  }[status];
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${cfg}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function FeaturedCard({
  challenge,
  busy,
  onJoin,
}: {
  challenge: ChallengeCatalogItem;
  busy: boolean;
  onJoin: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-accent/20">
      {/* Cinematic background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 85% 30%, rgba(200,30,30,0.35) 0%, transparent 55%),' +
            'linear-gradient(135deg, #0E0A0A 0%, #180808 100%)',
        }}
      />
      {/* Decorative helmet icon placeholder */}
      <div
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-15"
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(225,45,45,0.8) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600">
          {CATEGORY_LABELS[challenge.category]}
        </p>
        <p className="mt-0.5 text-sm font-extrabold uppercase tracking-[0.04em] text-accent">
          {challenge.title}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400">
          {challenge.durationDays}-дневный челлендж
        </p>
        {challenge.description && (
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
            {challenge.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-6 w-6 rounded-full border-2 border-[#180808]"
                style={{
                  background: `hsl(${i * 40 + 340}, 60%, 40%)`,
                }}
              />
            ))}
          </div>
          <span className="text-[11px] text-zinc-500">
            {challenge.participantCount} участников
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            `${challenge.durationDays} дней`,
            MODE_LABELS[challenge.mode],
            CATEGORY_LABELS[challenge.category],
            'XP награды',
          ].map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onJoin}
          disabled={busy || challenge.availablePlaces <= 0}
          className="mt-4 w-full rounded-lg bg-accent py-3 text-sm font-bold text-white shadow-red-soft transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? 'Вступаем...' : 'Присоединиться к челленджу'}
        </button>
      </div>
    </div>
  );
}

function LiveChallengeRow({
  challenge,
  busy,
  onJoin,
}: {
  challenge: ChallengeCatalogItem;
  busy: boolean;
  onJoin: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {/* Thumbnail */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.07]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(140,15,15,0.5) 0%, rgba(20,5,5,0.9) 100%)',
        }}
      >
        <Trophy size={16} className="text-accent/70" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{challenge.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-600">
          <span>{challenge.durationDays}-дн. челлендж</span>
          <span>·</span>
          <Users size={10} />
          <span>{challenge.participantCount}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onJoin}
        disabled={busy || challenge.availablePlaces <= 0}
        className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-red-soft disabled:opacity-50 active:scale-95"
      >
        {busy ? '...' : 'Вступить'}
      </button>
    </div>
  );
}

function MyChallengeRow({
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
    <div className="rounded-xl border border-white/[0.07] bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-accent">
            {CATEGORY_LABELS[challenge.category]}
          </p>
          <h3 className="mt-0.5 font-semibold text-zinc-100">{challenge.title}</h3>
        </div>
        <ChallengeStatusBadge status={challenge.challengeStatus} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-zinc-500">
          {MODE_LABELS[challenge.mode]}
        </span>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-zinc-500">
          Прогресс: {challenge.progress}
        </span>
        {date && (
          <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-zinc-600">
            {date}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[10px] text-zinc-600">
        Статус: {PARTICIPANT_LABELS[challenge.participantStatus]}
      </p>

      {challenge.result !== 'pending' && (
        <p className="mt-1.5 text-sm font-semibold text-accent">
          {challenge.result === 'winner' ? 'Победа'
            : challenge.result === 'draw' ? 'Ничья' : 'Завершено'}
        </p>
      )}

      {isInvitation && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
          <button type="button" onClick={onAccept} disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-xs font-semibold text-white disabled:opacity-50 shadow-red-soft">
            <Check size={13} /> Принять
          </button>
          <button type="button" onClick={onDecline} disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-surface-light py-2.5 text-xs font-semibold text-zinc-400 disabled:opacity-50">
            <X size={13} /> Отклонить
          </button>
        </div>
      )}

      {canCancel && (
        <button type="button" onClick={onCancel} disabled={busy}
          className="mt-3 w-full rounded-lg border border-red-400/25 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">
          Отменить соревнование
        </button>
      )}
    </div>
  );
}

function LoadingBlocks() {
  return (
    <div className="space-y-3" aria-label="Загрузка">
      {[1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl border border-white/5 bg-surface" />
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-12 text-center">
      <Trophy size={34} className="mx-auto mb-3 text-zinc-700" />
      <p className="font-semibold text-zinc-300">{title}</p>
      <p className="mt-1.5 text-sm text-zinc-600 max-w-[260px] mx-auto">{text}</p>
    </div>
  );
}

export function Competitions() {
  const [mainTab, setMainTab] = useState<MainTab>('challenges');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ChallengeCategory | ''>('');
  const [durationDays, setDurationDays] = useState<1 | 3 | 7 | ''>('');
  const [sort, setSort] = useState<'newest' | 'popular' | 'starting_soon' | 'recommended'>('newest');
  const [scope, setScope] = useState<Exclude<ChallengeScope, 'all'>>('invitations');
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
    if (mainTab !== 'challenges') return;
    const timer = window.setTimeout(() => void loadPublic(catalogFilters), 250);
    return () => window.clearTimeout(timer);
  }, [mainTab, catalogFilters, loadPublic]);

  useEffect(() => {
    if (mainTab === 'invitations') void loadMine('invitations');
    if (mainTab === 'rankings') void loadMine('active');
  }, [mainTab, loadMine]);

  const handleJoin = async (challengeId: string) => {
    if (await join(challengeId)) await Promise.all([loadPublic(catalogFilters), loadMine(scope)]);
  };

  const handleResponse = async (id: string, action: 'accept_invite' | 'decline_invite') => {
    if (await respond(id, action)) await loadMine(scope);
  };

  const handleCancel = async (id: string) => {
    if (await cancel(id)) await loadMine(scope);
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
    setForm((c) => ({ ...c, title: '', description: '', targetValue: '', invitedUserId: '' }));
    setShowCreate(false);
    setMainTab('rankings');
    setScope('active');
    await loadMine('active');
  };

  const inputClass = 'w-full rounded-lg border border-white/10 bg-surface px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30';
  const selectClass = 'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-zinc-100 focus:border-accent focus:outline-none cursor-pointer';

  const [featured, ...rest] = publicChallenges;
  const mineForTab = mainTab === 'invitations' ? myChallenges : myChallenges;

  return (
    <div className="safe-area-top overflow-x-hidden pb-24">
      {/* ─── Header bar ─── */}
      <header className="flex items-center justify-between gap-3 px-4 pb-4 pt-4">
        <span className="display-heading text-xl text-zinc-100 tracking-tight">NoExcuses</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1.5">
            <Flame size={14} className="text-accent" />
            <span className="text-sm font-bold text-zinc-100">12</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-gradient-to-br from-accent/30 to-accent/10 text-sm font-bold text-red-200">
            N
          </div>
        </div>
      </header>

      {/* ─── Title ─── */}
      <div className="px-4 pb-3">
        <h1 className="display-heading text-[2rem] uppercase leading-none tracking-tight text-zinc-100">
          Соревнования
        </h1>
      </div>

      {/* ─── Underline Tabs ─── */}
      <div className="px-4">
        <UnderlineTabs
          value={mainTab}
          onChange={setMainTab}
          options={[
            { value: 'challenges', label: 'Каталог' },
            { value: 'rankings', label: 'Мои' },
            { value: 'invitations', label: 'Приглашения' },
          ]}
        />
      </div>

      {/* ─── Messages ─── */}
      {(actionError || validationError) && (
        <div className="mx-4 mt-4 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
          {actionError || validationError}
        </div>
      )}
      {successMessage && (
        <div className="mx-4 mt-4 rounded-lg border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      <div className="mt-5 space-y-5 px-4">
        {/* ─── CHALLENGES tab ─── */}
        {mainTab === 'challenges' && (
          <section aria-label="Каталог челленджей">
            {/* Search + filters */}
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск соревнований"
                className={`${inputClass} pl-10`}
              />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value as ChallengeCategory | '')} className={selectClass}>
                <option value="">Все категории</option>
                {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={durationDays} onChange={(e) => setDurationDays(e.target.value ? Number(e.target.value) as 1 | 3 | 7 : '')} className={selectClass}>
                <option value="">Любая длительность</option>
                <option value="1">1 день</option>
                <option value="3">3 дня</option>
                <option value="7">7 дней</option>
              </select>
            </div>

            {catalogLoading ? (
              <LoadingBlocks />
            ) : catalogError ? (
              <EmptyState title="Ошибка загрузки" text={catalogError} />
            ) : publicChallenges.length === 0 ? (
              <EmptyState title="Ничего не найдено" text="Попробуйте изменить фильтры" />
            ) : (
              <>
                {/* Featured challenge */}
                {featured && (
                  <div>
                    <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">
                      Рекомендуем
                    </p>
                    <FeaturedCard
                      challenge={featured}
                      busy={actingId === featured.id}
                      onJoin={() => void handleJoin(featured.id)}
                    />
                  </div>
                )}

                {/* Live challenges list */}
                {rest.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">
                        Активные челленджи
                      </p>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-accent"
                        onClick={() => setSort('popular')}
                      >
                        Все
                      </button>
                    </div>
                    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-surface">
                      {rest.slice(0, 5).map((ch) => (
                        <div key={ch.id} className="px-3">
                          <LiveChallengeRow
                            challenge={ch}
                            busy={actingId === ch.id}
                            onJoin={() => void handleJoin(ch.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create your own */}
                <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.07] bg-surface px-4 py-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">Создай своё</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">Приглашай друзей, соревнуйся, зарабатывай XP</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white shadow-red-soft active:scale-95"
                  >
                    <Plus size={13} /> Создать
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ─── RANKINGS tab ─── */}
        {mainTab === 'rankings' && (
          <section aria-label="Рейтинг">
            {mineLoading ? (
              <LoadingBlocks />
            ) : mineError ? (
              <EmptyState title="Ошибка загрузки" text={mineError} />
            ) : myChallenges.length === 0 ? (
              <EmptyState title="Нет активных соревнований" text="Присоединитесь к челленджу в каталоге" />
            ) : (
              <div className="space-y-3">
                {myChallenges.map((ch) => (
                  <MyChallengeRow
                    key={ch.challengeId}
                    challenge={ch}
                    busy={actingId === ch.challengeId}
                    onAccept={() => void handleResponse(ch.challengeId, 'accept_invite')}
                    onDecline={() => void handleResponse(ch.challengeId, 'decline_invite')}
                    onCancel={() => void handleCancel(ch.challengeId)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── INVITATIONS tab ─── */}
        {mainTab === 'invitations' && (
          <section aria-label="Приглашения">
            {mineLoading ? (
              <LoadingBlocks />
            ) : mineError ? (
              <EmptyState title="Ошибка загрузки" text={mineError} />
            ) : mineForTab.length === 0 ? (
              <EmptyState title="Нет приглашений" text="Вас пока не приглашали в соревнования" />
            ) : (
              <div className="space-y-3">
                {mineForTab.map((ch) => (
                  <MyChallengeRow
                    key={ch.challengeId}
                    challenge={ch}
                    busy={actingId === ch.challengeId}
                    onAccept={() => void handleResponse(ch.challengeId, 'accept_invite')}
                    onDecline={() => void handleResponse(ch.challengeId, 'decline_invite')}
                    onCancel={() => void handleCancel(ch.challengeId)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ─── Create Challenge Modal ─── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-sm"
          style={{ touchAction: 'pan-y' }}
        >
          <div
            className="w-full max-w-[430px] overflow-y-auto rounded-t-[14px] border border-b-0 border-white/[0.07] bg-[#0D0D0E] p-4"
            style={{ maxHeight: '90dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
          >
            <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-[#0D0D0E] pb-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent">Новое</p>
                <h2 className="display-heading text-xl text-zinc-100">Создать соревнование</h2>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Закрыть"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-surface text-zinc-500">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4" aria-label="Создать соревнование">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Название</span>
                <input required minLength={3} maxLength={120} value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass} placeholder="7 дней дисциплины" />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Описание</span>
                <textarea maxLength={1000} rows={2} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`${inputClass} resize-none`} placeholder="Правила соревнования" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Категория</span>
                  <select value={form.category}
                    onChange={(e) => {
                      const nextCategory = e.target.value as ChallengeCategory;
                      setForm({ ...form, category: nextCategory, metricType: metricForCategory(nextCategory) });
                    }}
                    className={selectClass}>
                    {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Длительность</span>
                  <select value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) as 1 | 3 | 7 })}
                    className={selectClass}>
                    <option value="1">1 день</option>
                    <option value="3">3 дня</option>
                    <option value="7">7 дней</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Что считаем</span>
                <select value={form.metricType} disabled aria-readonly="true"
                  className={`${selectClass} opacity-60 cursor-not-allowed`}>
                  <option value="goals_completed">Выполненные цели</option>
                  <option value="program_days_completed">Дни программ</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Режим</span>
                <select value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value as ChallengeMode })}
                  className={selectClass}>
                  <option value="highest_score">Лучший результат</option>
                  <option value="first_to_target">Первый до цели</option>
                </select>
              </label>

              {form.mode === 'first_to_target' && (
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Целевое значение</span>
                  <input required min="1" type="number" inputMode="numeric"
                    value={form.targetValue}
                    onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                    className={inputClass} />
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Видимость</span>
                  <select value={form.visibility}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value as ChallengeVisibility })}
                    className={selectClass}>
                    <option value="public">Публичное</option>
                    <option value="link_only">По ссылке</option>
                    <option value="private">Приватное</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Вступление</span>
                  <select value={form.joinMode}
                    onChange={(e) => setForm({ ...form, joinMode: e.target.value as ChallengeJoinMode })}
                    className={selectClass}>
                    <option value="instant">Сразу</option>
                    <option value="approval">По заявке</option>
                    <option value="invite_only">По приглашению</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">
                  ID приглашённого
                </span>
                <input
                  required={form.visibility === 'private' || form.joinMode === 'invite_only'}
                  value={form.invitedUserId}
                  onChange={(e) => setForm({ ...form, invitedUserId: e.target.value })}
                  className={inputClass}
                  placeholder="Необязательно для публичного"
                />
              </label>

              {validationError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                  {validationError}
                </div>
              )}

              <PrimaryButton type="submit" disabled={creating} className="w-full">
                {creating ? 'Создаём...' : 'Создать соревнование'}
              </PrimaryButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
