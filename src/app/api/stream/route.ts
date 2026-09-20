import { NextRequest } from 'next/server';
import { getAppServices } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { collector } = getAppServices();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: any) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might be closed
        }
      };

      // Send initial health status
      sendEvent('health', collector.getHealth());

      // Subscribe to live collector events
      const unsubscribe = collector.subscribe((event, data) => {
        sendEvent(event, data);
      });

      // Keepalive heartbeat every 15s
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':ping\n\n'));
        } catch {
          clearInterval(pingInterval);
          unsubscribe();
        }
      }, 15_000);

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
