export function getApiErrorLogData(error: unknown) {
  const apiError = error as any;
  return {
    status: apiError?.response?.status,
    code: apiError?.response?.data?.code,
    message: apiError?.response?.data?.message ?? apiError?.message,
  };
}
