import { WebSocketServer } from 'ws'
import type { Server } from 'node:http'

let wss: WebSocketServer | undefined

export function initWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (socket) => {
    console.log('WebSocket client connected')

    socket.on('close', () => {
      console.log('WebSocket client disconnected')
    })
  })

  return wss
}

export function broadcast(data: unknown): void {
  if (!wss) return

  const message = JSON.stringify(data)
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message)
    }
  }
}
