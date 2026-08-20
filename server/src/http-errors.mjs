export const publicHttpError = (error) => {
  const status =
    Number.isInteger(error?.status) && error.status >= 400
      ? error.status
      : 500;
  return {
    message:
      status >= 500
        ? 'Unexpected server error.'
        : error?.message || 'Request failed.',
    status,
  };
};
