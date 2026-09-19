'use strict';

const path = require('node:path');

function getPathApi(platform) {
  return platform === 'win32' ? path.win32 : path.posix;
}

function normalizeForComparison(value, platform = process.platform) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const pathApi = getPathApi(platform);
  const comparableValue = platform === 'win32' ? removeWindowsDevicePrefix(value) : value;
  const resolved = pathApi.resolve(comparableValue);
  const root = pathApi.parse(resolved).root;
  const withoutTrailingSeparators = resolved === root ? resolved : resolved.replace(/[\\/]+$/, '');

  return platform === 'win32' ? withoutTrailingSeparators.toLowerCase() : withoutTrailingSeparators;
}

function removeWindowsDevicePrefix(value) {
  if (value.startsWith('\\\\?\\UNC\\')) {
    return `\\\\${value.slice(8)}`;
  }

  if (value.startsWith('\\\\?\\')) {
    return value.slice(4);
  }

  return value;
}

function isPathWithinRoot(candidatePath, rootPath, platform = process.platform) {
  const pathApi = getPathApi(platform);
  const candidate = normalizeForComparison(candidatePath, platform);
  const root = normalizeForComparison(rootPath, platform);

  if (!candidate || !root) {
    return false;
  }

  const relative = pathApi.relative(root, candidate);
  return (
    relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${pathApi.sep}`) && !pathApi.isAbsolute(relative))
  );
}

function filterSessionsForWorkspaceRoots(sessions, workspaceRoots, platform = process.platform) {
  const roots = workspaceRoots.filter((root) => typeof root === 'string' && root.trim());

  return sessions.filter((session) =>
    roots.some((root) => isPathWithinRoot(session.cwd, root, platform)),
  );
}

module.exports = {
  filterSessionsForWorkspaceRoots,
  isPathWithinRoot,
  normalizeForComparison,
  removeWindowsDevicePrefix,
};
