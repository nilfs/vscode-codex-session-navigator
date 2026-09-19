'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getCopyableSessionId,
  getCopyableSessionName,
  resolveSessionCommandArgument,
} = require('../lib/session-command-values');

const session = {
  id: 'session-debug-id',
  name: 'Debug session',
  preview: 'Fallback preview',
};

test('resolves the SessionTreeItem passed by a view context menu', () => {
  const treeItem = { label: 'Debug session', session };
  assert.equal(resolveSessionCommandArgument(treeItem), session);
  assert.equal(getCopyableSessionName(treeItem), 'Debug session');
  assert.equal(getCopyableSessionId(treeItem), 'session-debug-id');
});

test('continues to accept a session passed directly', () => {
  assert.equal(resolveSessionCommandArgument(session), session);
  assert.equal(getCopyableSessionName(session), 'Debug session');
  assert.equal(getCopyableSessionId(session), 'session-debug-id');
});

test('returns empty copy values for an invalid command argument', () => {
  assert.equal(getCopyableSessionName(undefined), '');
  assert.equal(getCopyableSessionId({}), '');
});
