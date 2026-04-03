export const ok = <T>(data: T, message = "success") => ({
  success: true,
  message,
  data
});

export const fail = (message: string, error?: unknown) => ({
  success: false,
  message,
  error
});
