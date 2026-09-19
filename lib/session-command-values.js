'use strict';

const { getSessionLabel } = require('./codex-state');

function resolveSessionCommandArgument(commandArgument) {
  if (!commandArgument || typeof commandArgument !== 'object') {
    return undefined;
  }

  if (commandArgument.session && typeof commandArgument.session === 'object') {
    return commandArgument.session;
  }

  return commandArgument;
}

function getCopyableSessionName(commandArgument) {
  const session = resolveSessionCommandArgument(commandArgument);
  return session ? getSessionLabel(session) : '';
}

function getCopyableSessionId(commandArgument) {
  const session = resolveSessionCommandArgument(commandArgument);
  return session && typeof session.id === 'string' ? session.id : '';
}

module.exports = {
  getCopyableSessionId,
  getCopyableSessionName,
  resolveSessionCommandArgument,
};
