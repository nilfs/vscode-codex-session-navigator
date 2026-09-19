'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const {
  findLatestStateDatabase,
  getSessionLabel,
  readLocalVscodeSessions,
} = require('../lib/codex-state');

function createTemporaryDirectory(testContext) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-session-test-'));
  testContext.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('selects the highest numbered Codex state database', (testContext) => {
  const directory = createTemporaryDirectory(testContext);
  fs.writeFileSync(path.join(directory, 'state_2.sqlite'), '');
  fs.writeFileSync(path.join(directory, 'state_11.sqlite'), '');
  fs.writeFileSync(path.join(directory, 'state.sqlite'), '');

  assert.equal(findLatestStateDatabase(directory), path.join(directory, 'state_11.sqlite'));
});

test('reads only unarchived VS Code sessions and sorts newest first', (testContext) => {
  const directory = createTemporaryDirectory(testContext);
  const databasePath = path.join(directory, 'state_5.sqlite');
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE threads (
      id TEXT PRIMARY KEY,
      cwd TEXT NOT NULL,
      source TEXT NOT NULL,
      archived INTEGER NOT NULL,
      name TEXT,
      preview TEXT,
      title TEXT,
      first_user_message TEXT,
      updated_at_ms INTEGER,
      updated_at INTEGER,
      created_at INTEGER
    )
  `);

  const insert = database.prepare(`
    INSERT INTO threads (
      id, cwd, source, archived, name, preview, updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run('older', '/work/repo', 'vscode', 0, 'Older', '', 1000);
  insert.run('newer', '/work/repo', 'vscode', 0, '', 'Newer preview', 2000);
  insert.run('archived', '/work/repo', 'vscode', 1, 'Archived', '', 3000);
  insert.run('cli', '/work/repo', 'cli', 0, 'CLI', '', 4000);
  database.close();

  const sessions = readLocalVscodeSessions({ databasePath });
  assert.deepEqual(
    sessions.map((session) => session.id),
    ['newer', 'older'],
  );
  assert.equal(getSessionLabel(sessions[0]), 'Newer preview');
  assert.equal(
    sessions.every((session) => session.archived === false),
    true,
  );

  const sessionsWithArchived = readLocalVscodeSessions({
    databasePath,
    includeArchived: true,
  });
  assert.deepEqual(
    sessionsWithArchived.map((session) => session.id),
    ['archived', 'newer', 'older'],
  );
  assert.equal(sessionsWithArchived[0].archived, true);
});

test('uses the first non-empty title source and collapses whitespace', () => {
  assert.equal(
    getSessionLabel({
      id: 'session-id',
      name: '  Named\n session  ',
      preview: 'Preview',
      title: 'Title',
      firstUserMessage: 'Prompt',
    }),
    'Named session',
  );
});
