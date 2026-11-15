export interface StreamFetchOptions {
  timeoutMs?: number;
  onProgress?: (message: string) => void;
}

export async function postJsonOrNdjson<T = any>(
  url: string,
  payload: unknown,
  options: StreamFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 95_000, onProgress } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson, application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("application/x-ndjson") && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: T | undefined;
      let streamError: string | null = null;

      const handleLine = (rawLine: string) => {
        const line = rawLine.trim();
        if (!line) return;
        let event: any = null;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }
        if (event?.type === "progress" && typeof event.message === "string") {
          onProgress?.(event.message);
        } else if (event?.type === "error") {
          streamError = event.error || "Live AI generation failed.";
        } else if (event?.type === "result") {
          finalResult = event.data as T;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx = buffer.indexOf("\n");
        while (newlineIdx !== -1) {
          const line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          handleLine(line);
          newlineIdx = buffer.indexOf("\n");
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        handleLine(buffer);
      }

      if (streamError) {
        throw new Error(streamError);
      }
      if (finalResult === undefined) {
        throw new Error("Live AI stream ended before returning results. Please click Try Again.");
      }
      return finalResult;
    }

    // Standard JSON (or unexpected HTML proxy response)
    const rawText = await response.text();
    let parsedBody: any = null;
    try {
      parsedBody = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsedBody = null;
    }

    if (!response.ok) {
      const isHtmlGatewayError = rawText.trim().startsWith("<");
      const errMessage =
        parsedBody?.error ||
        (isHtmlGatewayError
          ? `The server gateway timed out while waiting for live AI (HTTP ${response.status}). Please click Try Again.`
          : `Live AI request failed (HTTP ${response.status}). Please click Try Again.`);
      throw new Error(errMessage);
    }

    if (!parsedBody || typeof parsedBody !== "object") {
      throw new Error("Received an unexpected non-JSON response from the server. Please click Try Again.");
    }

    return parsedBody as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Live AI generation timed out. Please click Try Again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
