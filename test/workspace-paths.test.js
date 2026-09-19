'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { filterSessionsForWorkspaceRoots, isPathWithinRoot } = require('../lib/workspace-paths');

test('matches the workspace root and its descendants on Windows', () => {
  assert.equal(isPathWithinRoot('C:\\work\\repo', 'C:\\work\\repo', 'win32'), true);
  assert.equal(isPathWithinRoot('C:\\work\\repo\\packages\\app', 'C:\\work\\repo', 'win32'), true);
});

test('does not match a sibling with the same path prefix', () => {
  assert.equal(isPathWithinRoot('C:\\work\\repo-old', 'C:\\work\\repo', 'win32'), false);
});

test('Windows path matching is case-insensitive', () => {
  assert.equal(isPathWithinRoot('c:\\WORK\\Repo\\src', 'C:\\work\\repo', 'win32'), true);
});

test('matches Codex Windows device paths against regular workspace paths', () => {
  assert.equal(isPathWithinRoot('\\\\?\\D:\\work\\repo\\src', 'D:\\work\\repo', 'win32'), true);
  assert.equal(
    isPathWithinRoot('\\\\?\\UNC\\server\\share\\repo\\src', '\\\\server\\share\\repo', 'win32'),
    true,
  );
});

test('POSIX path matching is case-sensitive', () => {
  assert.equal(isPathWithinRoot('/work/repo/src', '/work/repo', 'linux'), true);
  assert.equal(isPathWithinRoot('/work/Repo/src', '/work/repo', 'linux'), false);
});

test('filters sessions against every workspace root', () => {
  const sessions = [
    { id: 'one', cwd: '/work/frontend' },
    { id: 'two', cwd: '/work/backend/services/api' },
    { id: 'three', cwd: '/work/unrelated' },
  ];

  assert.deepEqual(
    filterSessionsForWorkspaceRoots(sessions, ['/work/frontend', '/work/backend'], 'linux').map(
      (session) => session.id,
    ),
    ['one', 'two'],
  );
});
