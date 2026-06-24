import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('dark red design tokens replace the orange foundation', async () => {
  const [tailwind, css] = await Promise.all([
    read('tailwind.config.js'),
    read('src/index.css'),
  ]);

  for (const token of ['#070707', '#0D0D0E', '#121214', '#18181B', '#E12D2D', '#B91C1C']) {
    assert.ok(`${tailwind}\n${css}`.toLowerCase().includes(token.toLowerCase()));
  }
  assert.ok(!tailwind.includes('#FF6B35'));
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('redesign-overrides.css'));
});

test('bottom navigation keeps all tabs and safe-area spacing', async () => {
  const navigation = await read('src/components/BottomNavigation.tsx');

  for (const tab of ['dashboard', 'goals', 'programs', 'competitions', 'stats', 'profile']) {
    assert.ok(navigation.includes(`id: '${tab}'`));
  }
  assert.ok(navigation.includes('absolute inset-x-2 top-0'));
  assert.ok(navigation.includes('safe-area-inset-bottom'));
  assert.ok(navigation.includes('min-h-[72px]'));
});

test('dashboard preserves goal actions and wires every quick action', async () => {
  const [dashboard, app] = await Promise.all([
    read('src/components/Dashboard.tsx'),
    read('src/App.tsx'),
  ]);

  assert.ok(dashboard.includes('onGoalDone(goal.id)'));
  assert.ok(dashboard.includes('onGoalSkip(goal.id)'));
  assert.ok(dashboard.includes('onGoalFreeze(goal.id)'));
  assert.ok(dashboard.includes('await onAddGoal('));
  assert.ok(dashboard.includes("goal.frequency === 'daily'"));
  assert.ok(dashboard.includes("onNavigate('competitions')"));
  assert.ok(dashboard.includes("onNavigate('programs')"));
  assert.ok(app.includes('onNavigate={setActiveTab}'));
});

test('shared primitives cover the redesigned screens and resolve local assets', async () => {
  const primitives = await read('src/components/ui/Primitives.tsx');

  for (const primitive of [
    'PageHeader',
    'BrandedHeader',
    'HeroCard',
    'CircularProgress',
    'PosterTabs',
    'MetricCard',
    'ActionTile',
    'AppCard',
    'SectionHeader',
    'StatCard',
    'ProgressBar',
    'PrimaryButton',
    'SecondaryButton',
    'SegmentedControl',
    'StatusBadge',
  ]) {
    assert.ok(primitives.includes(`export function ${primitive}`));
  }

  assert.ok(primitives.includes("image?.startsWith('/redesign/')"));
  assert.ok(primitives.includes(".replace(/\\.(?:jpe?g|png)$/i, '.svg')"));
});

test('reference match screens use poster primitives and image slots', async () => {
  const [dashboard, programs, competitions, stats, profile, goals, overrides] = await Promise.all([
    read('src/components/Dashboard.tsx'),
    read('src/components/Programs.tsx'),
    read('src/components/Competitions.tsx'),
    read('src/components/Stats.tsx'),
    read('src/components/Profile.tsx'),
    read('src/components/Goals.tsx'),
    read('src/redesign-overrides.css'),
  ]);

  assert.ok(dashboard.includes('/redesign/dashboard-xp.svg'));
  assert.ok(dashboard.includes('/redesign/focus-card.svg'));
  assert.ok(dashboard.includes('CircularProgress'));
  assert.ok(dashboard.includes('ActionTile'));
  assert.ok(programs.includes('MY PROGRAMS'));
  assert.ok(programs.includes('EXPLORE'));
  assert.ok(programs.includes('/redesign/program-hero.jpg'));
  assert.ok(competitions.includes('CHALLENGES'));
  assert.ok(competitions.includes('MY CHALLENGES'));
  assert.ok(!competitions.includes("label: 'RANKINGS'"));
  assert.ok(competitions.includes('INVITATIONS'));
  assert.ok(competitions.includes('/redesign/challenge-featured.jpg'));
  assert.ok(competitions.includes('metricForCategory(form.category)'));
  assert.ok(stats.includes('BrandedHeader'));
  assert.ok(stats.includes('HeroCard'));
  assert.ok(stats.includes('StatCard'));
  assert.ok(profile.includes('PosterTabs'));
  assert.ok(profile.includes('ProgressBar'));
  assert.ok(goals.includes('PosterTabs'));
  assert.ok(overrides.includes('article.bg-surface'));
  assert.ok(overrides.includes('grid.grid-cols-3.gap-2.mt-3'));
});

test('goal management includes edit and soft-delete without changing earned rewards', async () => {
  const [app, goals] = await Promise.all([
    read('src/App.tsx'),
    read('src/components/Goals.tsx'),
  ]);

  assert.ok(app.includes('handleUpdateGoal'));
  assert.ok(app.includes('handleDeleteGoal'));
  assert.ok(app.includes('.update({ active: false })'));
  assert.ok(app.includes('onGoalUpdate={handleUpdateGoal}'));
  assert.ok(app.includes('onGoalDelete={handleDeleteGoal}'));
  assert.ok(goals.includes('Редактировать'));
  assert.ok(goals.includes('Удалить цель?'));
  assert.ok(goals.includes('XP и история выполнений сохранятся'));
  assert.ok(goals.includes('Тип цели не меняется'));
});

test('competition catalog is truthful and does not duplicate its featured challenge', async () => {
  const competitions = await read('src/components/Competitions.tsx');

  assert.ok(competitions.includes("label: 'MY CHALLENGES'"));
  assert.ok(competitions.includes('publicChallenges.filter((challenge) => challenge.id !== featured.id)'));
  assert.ok(competitions.includes("section === 'invitations' ? 'invitations' : scope"));
  assert.ok(competitions.includes('await refreshAfterAction()'));
  assert.ok(!competitions.includes('[0, 1, 2].map'));
});

test('hardening removes fake profile actions and blocks completed programs', async () => {
  const [programs, profile] = await Promise.all([
    read('src/components/Programs.tsx'),
    read('src/components/Profile.tsx'),
  ]);

  assert.ok(programs.includes('if (userProgram?.completed) return;'));
  assert.ok(programs.includes('const isCompletedProgram = Boolean(userProgram?.completed)'));
  assert.ok(!programs.includes('isCompletedRunning'));
  assert.ok(profile.includes('Настройки скоро появятся'));
  assert.ok(profile.includes('Скоро'));
  assert.ok(!profile.includes('ChevronRight'));
});

test('all cinematic image assets are committed', async () => {
  const assets = await Promise.all([
    read('public/redesign/dashboard-xp.svg'),
    read('public/redesign/focus-card.svg'),
    read('public/redesign/program-hero.svg'),
    read('public/redesign/workout-card.svg'),
    read('public/redesign/challenge-featured.svg'),
    read('public/redesign/challenge-badge.svg'),
  ]);

  for (const asset of assets) {
    assert.ok(asset.startsWith('<svg'));
    assert.ok(asset.includes('data:image/jpeg;base64,'));
  }
});

test('cinematic shell keeps mobile overflow guarded', async () => {
  const [css, overrides] = await Promise.all([
    read('src/index.css'),
    read('src/redesign-overrides.css'),
  ]);

  assert.ok(css.includes('repeating-linear-gradient'));
  assert.ok(css.includes('cinematic-card'));
  assert.ok(css.includes('athletic-panel'));
  assert.ok(css.includes('overflow-x: hidden'));
  assert.ok(overrides.includes('article.bg-surface'));
  assert.ok(overrides.includes('grid.grid-cols-3.gap-2.mt-3'));
  assert.ok(overrides.includes('grid-column: 1 / -1'));
  assert.ok(overrides.includes('max-width: 430px'));
});
