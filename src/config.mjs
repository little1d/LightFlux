import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const defaultConfigDirectory = () =>
  process.platform === 'win32'
    ? join(process.env.APPDATA ?? homedir(), 'LightFlux')
    : join(
        process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'),
        'lightflux',
      );

export const configPath = (
  configDirectory = defaultConfigDirectory(),
) => join(configDirectory, 'config.json');

export const readConfig = async (configDirectory) => {
  try {
    const parsed = JSON.parse(
      await readFile(configPath(configDirectory), 'utf8'),
    );
    if (
      parsed.schemaVersion !== 1 ||
      typeof parsed.apiUrl !== 'string' ||
      !parsed.apiUrl
    ) {
      return null;
    }
    return {
      apiUrl: parsed.apiUrl.replace(/\/$/, ''),
      schemaVersion: 1,
      ...(typeof parsed.workspaceId === 'string'
        ? { workspaceId: parsed.workspaceId }
        : {}),
      ...(typeof parsed.workspaceName === 'string'
        ? { workspaceName: parsed.workspaceName }
        : {}),
      ...(typeof parsed.projectId === 'string'
        ? { projectId: parsed.projectId }
        : {}),
      ...(typeof parsed.projectName === 'string'
        ? { projectName: parsed.projectName }
        : {}),
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const writeConfig = async (config, configDirectory) => {
  const destination = configPath(configDirectory);
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  await writeFile(destination, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
  return destination;
};
