/** Last API correlation id seen on a GraphQL response (ops-only). */
let lastCorrelationId: string | null = null;

export function getLastCorrelationId(): string | null {
  return lastCorrelationId;
}

export function rememberCorrelationIdFromResponse(response: Response): void {
  const id =
    response.headers.get("x-correlation-id") ??
    response.headers.get("x-request-id");
  if (id) lastCorrelationId = id;
}

/** Apollo HttpLink fetch wrapper: stash correlation id from each response. */
export async function correlationAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  rememberCorrelationIdFromResponse(response);
  return response;
}
