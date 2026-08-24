/** Best-effort API error message for axios (and plain Error) responses. */
export function getApiErrorMessage(err, fallback = "Something went wrong") {
  const data = err?.response?.data;

  if (data && typeof data === "object") {
    const fromObj = data.message || data.error || data.msg;
    if (fromObj) return String(fromObj);
  }

  if (typeof data === "string" && data.trim()) {
    if (/duplicate key|E11000|already exists/i.test(data)) {
      return "This email already exists in your school";
    }
    const pre = data.match(/<pre>([^<]+)<\/pre>/i);
    if (pre?.[1]) {
      const text = pre[1].trim();
      if (/duplicate key|E11000|email/i.test(text)) {
        return "This email already exists in your school";
      }
      return text.slice(0, 180);
    }
  }

  if (err?.message && !/^Request failed with status code/i.test(err.message)) {
    return err.message;
  }

  return fallback;
}
