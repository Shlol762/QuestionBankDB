interface ValidationErrorItem {
  msg?: string;
  loc?: (string | number)[];
}

interface AxiosErrorResponse {
  response?: {
    data?: {
      detail?: string | ValidationErrorItem[];
    };
  };
}

export const formatError = (err: unknown, defaultMsg: string): string => {
  const axiosError = err as AxiosErrorResponse;
  const detail = axiosError?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return (
      detail
        .map((d) => (typeof d === 'object' && d?.msg ? d.msg : JSON.stringify(d)))
        .join(', ') || defaultMsg
    );
  }
  return defaultMsg;
};
