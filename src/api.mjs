export class LightFluxApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const request = async (
  apiUrl,
  token,
  path,
  fetchImplementation,
) => {
  const response = await fetchImplementation(
    `${apiUrl.replace(/\/$/, '')}${path}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'lightflux-cli/0.0.0',
      },
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const unavailable =
      response.status === 404
        ? 'Workspace API is not available. It requires LightFlux 0.1.1.'
        : `LightFlux API request failed with status ${response.status}.`;
    throw new LightFluxApiError(body.error || unavailable, response.status);
  }
  return body;
};

export const createApiClient = ({
  apiUrl,
  token,
  fetchImplementation = fetch,
}) => ({
  listProjects: async (workspaceId) => {
    const result = await request(
      apiUrl,
      token,
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/projects`,
      fetchImplementation,
    );
    return result.projects;
  },
  listWorkspaces: async () => {
    const result = await request(
      apiUrl,
      token,
      '/api/v1/workspaces',
      fetchImplementation,
    );
    return result.workspaces;
  },
});
