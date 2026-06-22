import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('competitions tab and screen are connected to the app', async () => {
  const [app, navigation, screen] = await Promise.all([
    read('src/App.tsx'),
    read('src/components/BottomNavigation.tsx'),
    read('src/components/Competitions.tsx'),
  ]);

  assert.match(navigation, /id: 'competitions', label: 'Соревнования'/);
  assert.match(app, /case 'competitions'/);
  assert.match(app, /<Competitions \/>/);
  assert.match(screen, /Каталог/);
  assert.match(screen, /Мои/);
  assert.match(screen, /Создать/);
});

test('challenge client exposes all required integration actions', async () => {
  const [client, screen] = await Promise.all([
    read('src/lib/challengesApi.ts'),
    read('src/components/Competitions.tsx'),
  ]);

  for (const action of ['listPublic', 'listMine', 'create', 'join', 'respond', 'cancel']) {
    assert.match(client, new RegExp(`action: '${action}'`));
  }
  assert.match(screen, /accept_invite/);
  assert.match(screen, /decline_invite/);
  assert.match(screen, /first_to_target/);
  assert.match(screen, /invitedUserId/);
  assert.match(screen, /metricType: metricForCategory\(form\.category\)/);
  assert.match(screen, /metricType: metricForCategory\(nextCategory\)/);
  assert.match(screen, /value=\{form\.metricType\}[\s\S]*?disabled/);
});
