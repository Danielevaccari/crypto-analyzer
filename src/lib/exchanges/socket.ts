import type { StreamStatus } from '../types';

interface SocketOptions {
  url: string;
  onOpen?: (ws: WebSocket) => void;
  onMessage: (data: unknown) => void;
  onStatus?: (s: StreamStatus) => void;
}

/** WebSocket with exponential-backoff reconnect. Returns a close function. */
export function openSocket({ url, onOpen, onMessage, onStatus }: SocketOptions): () => void {
  let ws: WebSocket | undefined;
  let closed = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    onStatus?.(attempt === 0 ? 'connecting' : 'reconnecting');
    ws = new WebSocket(url);
    ws.onopen = () => {
      attempt = 0;
      onOpen?.(ws!);
      onStatus?.('live');
    };
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data as string));
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      if (closed) return;
      attempt += 1;
      onStatus?.('reconnecting');
      timer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5)));
    };
    ws.onerror = () => ws?.close();
  };

  connect();

  return () => {
    closed = true;
    clearTimeout(timer);
    if (ws && ws.readyState === WebSocket.CONNECTING) {
      // Closing a socket that is still connecting logs a browser warning; close once it opens instead.
      ws.onopen = () => ws?.close();
    } else {
      ws?.close();
    }
  };
}
