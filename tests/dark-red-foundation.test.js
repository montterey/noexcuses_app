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

test('dashboard preserves goal actions and add-goal wiring', async () => {
  const dashboard = await read('src/components/Dashboard.tsx');

  assert.ok(dashboard.includes('onGoalDone(goal.id)'));
  assert.ok(dashboard.includes('onGoalSkip(goal.id)'));
  assert.ok(dashboard.includes('onGoalFreeze(goal.id)'));
  assert.ok(dashboard.includes('await onAddGoal('));
  assert.ok(dashboard.includes("goal.frequency === 'daily'"));
});

test('shared primitives cover the redesigned screens', async () => {
  const primitives = await read('src/components/ui/Primitives.tsx');

  for (const primitive of [
    'PageHeader',
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
});

test('stats profile and remaining screens use the expanded design system', async () => {
  const [stats, profile, overrides] = await Promise.all([
    read('src/components/Stats.tsx'),
    read('src/components/Profile.tsx'),
    read('src/redesign-overrides.css'),
  ]);

  assert.ok(stats.includes('PageHeader'));
  assert.ok(stats.includes('StatCard'));
  assert.ok(profile.includes('SegmentedControl'));
  assert.ok(profile.includes('ProgressBar'));
  assert.ok(overrides.includes('article.bg-surface'));
  assert.ok(overrides.includes('grid.grid-cols-3.gap-2.mt-3'));
  assert.ok(overrides.includes('grid-column: 1 / -1'));
  assert.ok(overrides.includes('max-width: 430px'));
});
