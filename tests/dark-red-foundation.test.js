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
    assert.match(`${tailwind}\n${css}`, new RegExp(token, 'i'));
  }
  assert.doesNotMatch(tailwind, /#FF6B35/i);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /overflow-x: hidden/);
});

test('bottom navigation keeps every current tab with a red active indicator', async () => {
  const navigation = await read('src/components/BottomNavigation.tsx');

  for (const tab of ['dashboard', 'goals', 'programs', 'competitions', 'stats', 'profile']) {
    assert.match(navigation, new RegExp(`id: '${tab}'`));
  }
  assert.match(navigation, /absolute inset-x-3 top-0/);
  assert.match(navigation, /bg-accent/);
});

test('dashboard preserves goal actions and add-goal wiring', async () => {
  const dashboard = await read('src/components/Dashboard.tsx');

  assert.match(dashboard, /onGoalDone\(goal\.id\)/);
  assert.match(dashboard, /onGoalSkip\(goal\.id\)/);
  assert.match(dashboard, /onGoalFreeze\(goal\.id\)/);
  assert.match(dashboard, /await onAddGoal\(/);
  assert.match(dashboard, /goal\.frequency === 'daily'/);
});

test('foundation exposes the small shared primitive set', async () => {
  const primitives = await read('src/components/ui/Primitives.tsx');

  for (const primitive of ['AppCard', 'SectionHeader', 'StatCard', 'ProgressBar', 'PrimaryButton', 'StatusBadge']) {
    assert.match(primitives, new RegExp(`export function ${primitive}`));
  }
});
