import { getCenterAvailability } from '@/lib/db'

export const dynamic = 'force-dynamic'

// How often each open connection re-reads the DB for changes, and how long
// a single connection stays open before the server closes it. EventSource
// auto-reconnects when the connection closes, so MAX_CONNECTION_MS just
// bounds how long any one request needs to stay alive — it works the same
// whether there's one dev server process or many serverless instances,
// since there's no in-memory pub/sub, just each connection polling the
// shared DB on its own.
const CHECK_MS = 1200
const MAX_CONNECTION_MS = 50000

// SSE version of GET /api/bookings — pushes the byRoom availability
// snapshot to the client only when it changes, so a seat someone else
// booked in a different browser flips to occupied within ~1-2s instead of
// every client polling on its own timer.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const centerId = params.get('centerId') || ''
  const date = params.get('date') || ''

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      if (!centerId || !date) {
        send({ byRoom: {} })
        closed = true
        controller.close()
        return
      }

      let lastSent = ''
      const tick = async () => {
        if (closed) return
        try {
          const byRoom = await getCenterAvailability(centerId, date)
          const json = JSON.stringify(byRoom)
          if (json !== lastSent) {
            lastSent = json
            send({ byRoom })
          }
        } catch (err) {
          console.error('[bookings stream]', err)
        }
      }

      await tick()
      const interval = setInterval(tick, CHECK_MS)
      const timeout = setTimeout(() => {
        clearInterval(interval)
        if (!closed) {
          closed = true
          try {
            controller.close()
          } catch {
            /* client may have already disconnected */
          }
        }
      }, MAX_CONNECTION_MS)

      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        clearTimeout(timeout)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
