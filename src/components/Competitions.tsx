import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Plus, Search, Shield, Trophy, UserRound, Users, X } from 'lucide-react';
import { useChallenges } from '../hooks/useChallenges';
import { isValidUuid, metricForCategory } from '../lib/challengeRules';
import { ChallengeCatalogItem, ChallengeCategory, ChallengeJoinMode, ChallengeMetric, ChallengeMode, ChallengeScope, ChallengeStatus, ChallengeVisibility, CreateChallengeInput, UserChallengeListItem } from '../types';
import { AppCard, HeroCard, PosterTabs, PrimaryButton, SectionHeader, StatusBadge as UiStatusBadge } from './ui/Primitives';

type CompetitionSection = 'catalog' | 'mine' | 'invitations' | 'create';

const CATEGORY_LABELS: Record<ChallengeCategory, string> = { fitness: 'Фитнес', running: 'Бег', sleep: 'Сон', reading: 'Чтение', goals: 'Цели', programs: 'Программы' };
const METRIC_LABELS: Record<ChallengeMetric, string> = { goals_completed: 'Выполненные цели', program_days_completed: 'Дни программ' };
const MODE_LABELS: Record<ChallengeMode, string> = { highest_score: 'Лучший результат', first_to_target: 'До заданной цели' };
const STATUS_LABELS: Record<ChallengeStatus, string> = { open: 'Открыто', full: 'Набрано', active: 'Идёт', completed: 'Завершено', cancelled: 'Отменено', expired: 'Истекло' };
const PARTICIPANT_LABELS: Record<UserChallengeListItem['participantStatus'], string> = { invited: 'Приглашение', pending: 'Заявка на рассмотрении', approved: 'Готово к старту', active: 'Участвует', rejected: 'Отклонено', declined: 'Отказ', left: 'Покинул', completed: 'Завершил' };
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as Array<[ChallengeCategory, string]>;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function StatusBadge({ status }: { status: ChallengeStatus }) {
  const tone = status === 'active' ? 'green' : status === 'completed' ? 'red' : status === 'cancelled' || status === 'expired' ? 'neutral' : 'cyan';
  return <UiStatusBadge tone={tone}>{STATUS_LABELS[status]}</UiStatusBadge>;
}

function LoadingBlocks() {
  return <div className="space-y-3" aria-label="Загрузка соревнований">{[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[18px] border border-white/5 bg-surface" />)}</div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <AppCard className="py-14 text-center"><Trophy size={36} className="mx-auto mb-3 text-zinc-700" /><p className="mb-1 font-semibold text-zinc-200">{title}</p><p className="mx-auto max-w-[280px] text-sm text-zinc-500">{text}</p></AppCard>;
}

function PublicChallengeCard({ challenge, busy, onJoin }: { challenge: ChallengeCatalogItem; busy: boolean; onJoin: () => void }) {
  const creator = challenge.creatorUsername ? `@${challenge.creatorUsername}` : challenge.creatorFirstName;
  return (
    <article className="relative overflow-hidden rounded-[18px] border border-white/10 bg-surface p-4">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-accent/12 to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><p className="poster-overline mb-1">{CATEGORY_LABELS[challenge.category]}</p><h3 className="display-heading text-[28px] leading-none text-white">{challenge.title}</h3></div><StatusBadge status={challenge.challengeStatus} /></div>
        {challenge.description && <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">{challenge.description}</p>}
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-zinc-400"><span className="flex items-center gap-1.5"><Trophy size={14} className="text-zinc-500" />{MODE_LABELS[challenge.mode]}</span><span className="flex items-center gap-1.5"><Clock3 size={14} className="text-zinc-500" />{challenge.durationDays} дн.</span><span className="flex items-center gap-1.5"><Users size={14} className="text-zinc-500" />{challenge.participantCount}/{challenge.maxParticipants}</span><span className="flex min-w-0 items-center gap-1.5"><UserRound size={14} className="shrink-0 text-zinc-500" /><span className="truncate">{creator}</span></span></div>
        <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3"><span className="text-xs text-zinc-500">{METRIC_LABELS[challenge.metricType]}</span><button type="button" onClick={onJoin} disabled={busy || challenge.availablePlaces <= 0} className="rounded-full bg-accent px-4 py-2 text-sm font-extrabold text-white shadow-red-soft transition-all active:scale-95 disabled:opacity-50">{busy ? 'Вступаем...' : 'Присоединиться'}</button></div>
      </div>
    </article>
  );
}

function MyChallengeCard({ challenge, busy, onAccept, onDecline, onCancel }: { challenge: UserChallengeListItem; busy: boolean; onAccept: () => void; onDecline: () => void; onCancel: () => void }) {
  const isInvitation = challenge.participantStatus === 'invited';
  const canCancel = challenge.isCreator && (challenge.challengeStatus === 'open' || challenge.challengeStatus === 'full');
  const date = challenge.challengeStatus === 'completed' ? formatDate(challenge.endsAt) : formatDate(challenge.startsAt);
  return (
    <article className="rounded-[18px] border border-white/10 bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><p className="poster-overline mb-1">{CATEGORY_LABELS[challenge.category]}</p><h3 className="display-heading text-[26px] leading-none text-white">{challenge.title}</h3></div><StatusBadge status={challenge.challengeStatus} /></div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-zinc-400"><span>{MODE_LABELS[challenge.mode]}</span><span>{METRIC_LABELS[challenge.metricType]}</span><span>Прогресс: {challenge.progress}</span>{date && <span>{date}</span>}</div>
      <p className="mb-3 text-xs text-zinc-500">Статус участия: {PARTICIPANT_LABELS[challenge.participantStatus]}</p>
      {challenge.result !== 'pending' && <p className="mb-3 text-sm text-accent">{challenge.result === 'winner' ? 'Победа' : challenge.result === 'draw' ? 'Ничья' : 'Участие завершено'}</p>}
      {isInvitation && <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3"><button type="button" onClick={onAccept} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Check size={16} /> Принять</button><button type="button" onClick={onDecline} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-lg bg-surface-light py-2.5 text-sm font-semibold text-zinc-300 disabled:opacity-50"><X size={16} /> Отклонить</button></div>}
      {canCancel && <button type="button" onClick={onCancel} disabled={busy} className="mt-3 w-full rounded-lg border border-red-400/20 py-2 text-sm text-red-300 disabled:opacity-50">Отменить соревнование</button>}
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
  const [form, setForm] = useState({ title: '', description: '', category: 'goals' as ChallengeCategory, metricType: metricForCategory('goals'), mode: 'highest_score' as ChallengeMode, targetValue: '', durationDays: 3 as 1 | 3 | 7, visibility: 'public' as ChallengeVisibility, joinMode: 'instant' as ChallengeJoinMode, invitedUserId: '' });
  const { publicChallenges, myChallenges, catalogLoading, mineLoading, catalogError, mineError, actionError, actingId, creating, loadPublic, loadMine, join, respond, cancel, create, clearActionError } = useChallenges();

  const catalogFilters = useMemo(() => ({ search: search.trim() || undefined, category: category || undefined, durationDays: durationDays || undefined, sort, pageSize: 30 }), [search, category, durationDays, sort]);

  useEffect(() => { if (section !== 'catalog') return; const timer = window.setTimeout(() => void loadPublic(catalogFilters), 250); return () => window.clearTimeout(timer); }, [section, catalogFilters, loadPublic]);
  useEffect(() => { if (section === 'mine' || section === 'invitations') void loadMine(section === 'invitations' ? 'invitations' : scope); }, [section, scope, loadMine]);

  const refreshAfterAction = async () => { await Promise.all([loadPublic(catalogFilters), loadMine(scope)]); };
  const handleJoin = async (challengeId: string) => { if (await join(challengeId)) await refreshAfterAction(); };
  const handleResponse = async (challengeId: string, responseAction: 'accept_invite' | 'decline_invite') => { if (await respond(challengeId, responseAction)) await loadMine(scope); };
  const handleCancel = async (challengeId: string) => { if (await cancel(challengeId)) await loadMine(scope); };
  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
    setValidationError(null);
    clearActionError();
    const invitedUserId = form.invitedUserId.trim();
    if (invitedUserId && !isValidUuid(invitedUserId)) { setValidationError('ID приглашённого пользователя должен быть корректным UUID'); return; }
    const input: CreateChallengeInput = { title: form.title.trim(), description: form.description.trim() || undefined, category: form.category, metricType: metricForCategory(form.category), mode: form.mode, targetValue: form.mode === 'first_to_target' ? Number(form.targetValue) : undefined, durationDays: form.durationDays, visibility: form.visibility, joinMode: form.joinMode, invitedUserId: invitedUserId || undefined };
    const result = await create(input);
    if (!result.success) return;
    setSuccessMessage('Соревнование создано');
    setForm((current) => ({ ...current, title: '', description: '', targetValue: '', invitedUserId: '' }));
    setScope('active');
    setSection('mine');
    await loadMine('active');
  };
  const handleTopTab = (nextSection: CompetitionSection) => { setSection(nextSection); if (nextSection === 'invitations') setScope('invitations'); if (nextSection === 'mine') setScope('active'); setSuccessMessage(null); setValidationError(null); clearActionError(); };

  const selectClass = 'w-full bg-surface border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-accent';
  const inputClass = 'w-full bg-surface border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent box-border';
  const featured = publicChallenges[0];

  return (
    <div className="overflow-x-hidden px-4 pb-32 pt-5">
      <header className="mb-4"><p className="poster-overline mb-2">Live mode</p><h1 className="display-heading text-[38px] leading-none text-white">COMPETITIONS</h1></header>
      <PosterTabs value={section === 'create' ? 'catalog' : section} onChange={handleTopTab} className="mb-4" options={[{ value: 'catalog', label: 'CHALLENGES' }, { value: 'mine', label: 'RANKINGS' }, { value: 'invitations', label: 'INVITATIONS' }]} />
      {actionError && <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{actionError}</div>}
      {validationError && <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{validationError}</div>}
      {successMessage && <div className="mb-4 rounded-lg border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-300">{successMessage}</div>}

      {section === 'catalog' && <section aria-label="Каталог соревнований" className="space-y-4"><HeroCard overline={featured ? `${CATEGORY_LABELS[featured.category]} · ${featured.durationDays} дн.` : 'Featured challenge'} title={featured?.title || 'Брось вызов дисциплине'} subtitle={featured?.description || 'Соревнуйтесь в целях, программах и ежедневной дисциплине.'} image="/redesign/challenge-featured.jpg" className="min-h-[220px]"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><Users size={15} className="text-accent" />{featured ? `${featured.participantCount}/${featured.maxParticipants}` : 'Live'}</span>{featured && <button type="button" onClick={() => void handleJoin(featured.id)} disabled={actingId === featured.id || featured.availablePlaces <= 0} className="rounded-full bg-accent px-4 py-2 text-xs font-extrabold uppercase text-white shadow-red-soft disabled:opacity-50">Join</button>}</div></HeroCard><button type="button" onClick={() => setSection('create')} className="flex w-full items-center justify-between rounded-[18px] border border-accent/20 bg-accent/[0.08] p-4 text-left"><div className="min-w-0"><p className="poster-overline mb-1">Create your own</p><p className="display-heading text-2xl leading-none text-white">Запусти свой челлендж</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Plus size={18} /></span></button><div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск соревнований" className={`${inputClass} pl-10`} /></div><div className="grid grid-cols-2 gap-2"><select value={category} onChange={(event) => setCategory(event.target.value as ChallengeCategory | '')} className={selectClass}><option value="">Все категории</option>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={durationDays} onChange={(event) => setDurationDays(event.target.value ? Number(event.target.value) as 1 | 3 | 7 : '')} className={selectClass}><option value="">Любая длительность</option><option value="1">1 день</option><option value="3">3 дня</option><option value="7">7 дней</option></select><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className={`${selectClass} col-span-2`}><option value="newest">Сначала новые</option><option value="popular">Популярные</option><option value="starting_soon">Скоро начинаются</option><option value="recommended">Рекомендуемые</option></select></div><SectionHeader eyebrow="Live" title="Live challenges" />{catalogLoading ? <LoadingBlocks /> : catalogError ? <EmptyState title="Не удалось загрузить каталог" text={catalogError} /> : publicChallenges.length === 0 ? <EmptyState title="Ничего не найдено" text="Попробуйте изменить поиск или фильтры" /> : <div className="space-y-3">{publicChallenges.map((challenge) => <PublicChallengeCard key={challenge.id} challenge={challenge} busy={actingId === challenge.id} onJoin={() => void handleJoin(challenge.id)} />)}</div>}</section>}

      {(section === 'mine' || section === 'invitations') && <section aria-label="Мои соревнования" className="space-y-4">{section === 'mine' && <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.06] bg-[#0D0D0E] p-1">{([['active', 'Активные'], ['invitations', 'Приглашения'], ['history', 'История']] as Array<[Exclude<ChallengeScope, 'all'>, string]>).map(([id, label]) => <button key={id} type="button" onClick={() => setScope(id)} className={`rounded-lg py-2 text-[11px] font-medium ${scope === id ? 'bg-surface-light text-white' : 'text-zinc-500'}`}>{label}</button>)}</div>}{mineLoading ? <LoadingBlocks /> : mineError ? <EmptyState title="Не удалось загрузить список" text={mineError} /> : myChallenges.length === 0 ? <EmptyState title={section === 'invitations' || scope === 'invitations' ? 'Нет приглашений' : 'Список пуст'} text={scope === 'history' ? 'Завершённые соревнования появятся здесь' : 'Выберите соревнование в каталоге или создайте своё'} /> : <div className="space-y-3">{myChallenges.map((challenge) => <MyChallengeCard key={challenge.challengeId} challenge={challenge} busy={actingId === challenge.challengeId} onAccept={() => void handleResponse(challenge.challengeId, 'accept_invite')} onDecline={() => void handleResponse(challenge.challengeId, 'decline_invite')} onCancel={() => void handleCancel(challenge.challengeId)} />)}</div>}</section>}

      {section === 'create' && <form onSubmit={handleCreate} className="space-y-4" aria-label="Создать соревнование"><button type="button" onClick={() => setSection('catalog')} className="text-sm font-semibold text-zinc-500">← Назад к соревнованиям</button><HeroCard overline="Create" title="Новый челлендж" subtitle="Выберите категорию, правила и формат участия." image="/redesign/challenge-badge.png" className="min-h-[180px]" /><label className="block"><span className="mb-1.5 block text-sm text-zinc-300">Название</span><input required minLength={3} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Например, 7 дней дисциплины" /></label><label className="block"><span className="mb-1.5 block text-sm text-zinc-300">Описание</span><textarea maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} resize-none`} placeholder="Коротко опишите правила" /></label><div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-sm text-zinc-300">Категория</span><select value={form.category} onChange={(event) => { const nextCategory = event.target.value as ChallengeCategory; setForm({ ...form, category: nextCategory, metricType: metricForCategory(nextCategory) }); }} className={selectClass}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="mb-1.5 block text-sm text-zinc-300">Длительность</span><select value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: Number(event.target.value) as 1 | 3 | 7 })} className={selectClass}><option value="1">1 день</option><option value="3">3 дня</option><option value="7">7 дней</option></select></label></div><label className="block"><span className="mb-1.5 block text-sm text-zinc-300">Что считаем</span><select value={form.metricType} disabled aria-readonly="true" className={`${selectClass} cursor-not-allowed opacity-70`}><option value="goals_completed">Выполненные цели</option><option value="program_days_completed">Дни программ</option></select></label><label className="block"><span className="mb-1.5 block text-sm text-zinc-300">Режим</span><select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as ChallengeMode })} className={selectClass}><option value="highest_score">Лучший результат</option><option value="first_to_target">Первый до цели</option></select></label>{form.mode === 'first_to_target' && <label className="block"><span className="mb-1.5 block text-sm text-zinc-300">Целевое значение</span><input required min="1" type="number" inputMode="numeric" value={form.targetValue} onChange={(event) => setForm({ ...form, targetValue: event.target.value })} className={inputClass} /></label>}<div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-sm text-zinc-300">Видимость</span><select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ChallengeVisibility })} className={selectClass}><option value="public">Публичное</option><option value="link_only">По ссылке</option><option value="private">Приватное</option></select></label><label><span className="mb-1.5 block text-sm text-zinc-300">Вступление</span><select value={form.joinMode} onChange={(event) => setForm({ ...form, joinMode: event.target.value as ChallengeJoinMode })} className={selectClass}><option value="instant">Сразу</option><option value="approval">По заявке</option><option value="invite_only">По приглашению</option></select></label></div><label className="block"><span className="mb-1.5 block text-sm text-zinc-300">ID приглашённого пользователя</span><input required={form.visibility === 'private' || form.joinMode === 'invite_only'} value={form.invitedUserId} onChange={(event) => setForm({ ...form, invitedUserId: event.target.value })} className={inputClass} placeholder="Необязательно для публичного" /></label><PrimaryButton type="submit" disabled={creating} className="flex w-full items-center justify-center gap-2"><Shield size={17} />{creating ? 'Создаём...' : 'Создать соревнование'}</PrimaryButton></form>}
    </div>
  );
}
