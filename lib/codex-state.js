'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SESSION_COLUMNS = [
  'id',
  'cwd',
  'source',
  'archived',
  'name',
  'preview',
  'title',
  'first_user_message',
  'updated_at_ms',
  'updated_at',
  'created_at',
];

const REQUIRED_COLUMNS = ['id', 'cwd', 'source', 'archived'];

class CodexStateError extends Error {
  constructor(code, message, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'CodexStateError';
    this.code = code;
  }
}

function getCodexHome(environment = process.env, homeDirectory = os.homedir()) {
  const configuredHome =
    typeof environment.CODEX_HOME === 'string' ? environment.CODEX_HOME.trim() : '';

  return path.resolve(configuredHome || path.join(homeDirectory, '.codex'));
}

function findLatestStateDatabase(codexHome) {
  let entries;
  try {
    entries = fs.readdirSync(codexHome, { withFileTypes: true });
  } catch (error) {
    throw new CodexStateError(
      'CODEX_HOME_UNAVAILABLE',
      `Could not read CODEX_HOME at ${codexHome}.`,
      error,
    );
  }

  const candidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const match = /^state_(\d+)\.sqlite$/.exec(entry.name);
      return match ? { name: entry.name, version: Number(match[1]) } : undefined;
    })
    .filter(Boolean)
    .sort((left, right) => right.version - left.version);

  if (candidates.length === 0) {
    throw new CodexStateError(
      'STATE_DATABASE_NOT_FOUND',
      `No Codex state database was found in ${codexHome}.`,
    );
  }

  return path.join(codexHome, candidates[0].name);
}

function getDatabaseSync() {
  try {
    return require('node:sqlite').DatabaseSync;
  } catch (error) {
    throw new CodexStateError(
      'SQLITE_UNAVAILABLE',
      'This VS Code version does not provide the required node:sqlite module.',
      error,
    );
  }
}

function readLocalVscodeSessions(options = {}) {
  const codexHome = options.codexHome || getCodexHome();
  const databasePath = options.databasePath || findLatestStateDatabase(codexHome);
  const DatabaseSync = options.DatabaseSync || getDatabaseSync();
  let database;

  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const schemaRows = database.prepare('PRAGMA table_info(threads)').all();
    const availableColumns = new Set(schemaRows.map((row) => String(row.name)));

    const missingColumns = REQUIRED_COLUMNS.filter((column) => !availableColumns.has(column));
    if (missingColumns.length > 0) {
      throw new CodexStateError(
        'INCOMPATIBLE_SCHEMA',
        `The Codex session database is incompatible. Missing columns: ${missingColumns.join(', ')}.`,
      );
    }

    const selectList = SESSION_COLUMNS.map((column) =>
      availableColumns.has(column) ? `"${column}"` : `NULL AS "${column}"`,
    ).join(', ');

    const archivedClause = options.includeArchived ? '' : 'AND COALESCE(archived, 0) = 0';
    const rows = database
      .prepare(
        `
      SELECT ${selectList}
      FROM threads
      WHERE source = 'vscode'
        ${archivedClause}
    `,
      )
      .all();

    return rows.map(normalizeSession).sort((left, right) => right.updatedAtMs - left.updatedAtMs);
  } catch (error) {
    if (error instanceof CodexStateError) {
      throw error;
    }

    throw new CodexStateError(
      'STATE_DATABASE_READ_FAILED',
      `Could not read Codex sessions from ${databasePath}: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  } finally {
    if (database) {
      database.close();
    }
  }
}

function normalizeSession(row) {
  return {
    id: asString(row.id),
    cwd: asString(row.cwd),
    source: asString(row.source),
    archived: Boolean(row.archived),
    name: asString(row.name),
    preview: asString(row.preview),
    title: asString(row.title),
    firstUserMessage: asString(row.first_user_message),
    updatedAtMs: getTimestampMs(row),
  };
}

function getTimestampMs(row) {
  const millisecondValue = toPositiveNumber(row.updated_at_ms);
  if (millisecondValue) {
    return millisecondValue;
  }

  const updatedValue = toTimestamp(row.updated_at);
  if (updatedValue) {
    return updatedValue;
  }

  return toTimestamp(row.created_at) || 0;
}

function toTimestamp(value) {
  const numericValue = toPositiveNumber(value);
  if (numericValue) {
    return numericValue >= 1_000_000_000_000 ? numericValue : numericValue * 1000;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function getSessionLabel(session) {
  const candidate = [
    session.name,
    session.preview,
    session.title,
    session.firstUserMessage,
    session.id,
  ].find((value) => typeof value === 'string' && value.trim());

  const normalized = (candidate || 'Untitled session').replace(/\s+/g, ' ').trim();
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

module.exports = {
  CodexStateError,
  findLatestStateDatabase,
  getCodexHome,
  getSessionLabel,
  readLocalVscodeSessions,
};
