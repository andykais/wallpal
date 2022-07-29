import { WallPal, Action, MessageContract } from './base.ts'

class WallPalClient extends WallPal {
  async do_action(action: Action) {
    const ipc_socket_filepath = this.resolve_path(this.config.ipc_unix_socket)
    const conn = await Deno.connect({ path: ipc_socket_filepath, transport: 'unix' })
    const message: MessageContract = { action }
    const stringified = JSON.stringify(message)
    const bytes = this.text_encoder.encode(stringified)
    conn.write(bytes)
  }
}

export { WallPalClient }
