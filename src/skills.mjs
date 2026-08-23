import {
  cp,
  lstat,
  mkdir,
  readlink,
  rm,
  symlink,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const exists = async (path) => {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

const installDestination = async ({
  agent,
  canonicalPath,
  destination,
  force,
}) => {
  if (await exists(destination)) {
    const stat = await lstat(destination);
    if (stat.isSymbolicLink()) {
      const target = resolve(dirname(destination), await readlink(destination));
      if (target === canonicalPath) {
        return { agent, mode: 'unchanged', path: destination };
      }
    }
    if (!force) {
      throw new Error(
        `${destination} already exists. Re-run with --force to replace it.`,
      );
    }
    await rm(destination, { recursive: true, force: true });
  }

  await mkdir(dirname(destination), { recursive: true });
  try {
    await symlink(
      canonicalPath,
      destination,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    return { agent, mode: 'link', path: destination };
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code ?? '')) {
      throw error;
    }
    await cp(canonicalPath, destination, { recursive: true });
    return { agent, mode: 'copy', path: destination };
  }
};

export const installLightFluxSkill = async ({
  force = false,
  homeDirectory = homedir(),
  sourceDirectory = join(packageRoot, 'skills', 'lightflux'),
} = {}) => {
  const canonicalPath = join(
    homeDirectory,
    '.agents',
    'skills',
    'lightflux',
  );
  if (await exists(canonicalPath)) {
    if (!force) {
      throw new Error(
        `${canonicalPath} already exists. Re-run with --force to update it.`,
      );
    }
    await rm(canonicalPath, { recursive: true, force: true });
  }
  await mkdir(dirname(canonicalPath), { recursive: true });
  await cp(sourceDirectory, canonicalPath, { recursive: true });

  const destinations = await Promise.all([
    installDestination({
      agent: 'claude-code',
      canonicalPath,
      destination: join(
        homeDirectory,
        '.claude',
        'skills',
        'lightflux',
      ),
      force,
    }),
    installDestination({
      agent: 'codex',
      canonicalPath,
      destination: join(
        homeDirectory,
        '.codex',
        'skills',
        'lightflux',
      ),
      force,
    }),
  ]);

  return { canonicalPath, destinations };
};
