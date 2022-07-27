import * as io from "std/io"
import * as keypress from 'keypress/mod.ts'
import { WallPal, Action, MessageContract } from './base.ts'


class WallPalDaemon extends WallPal {
  async do_action(action: Action) {
    console.log('display image', action)

  }

  public async init() {
    await super.init()
    const ipc_socket_filepath = this.resolve_path(this.config.ipc_unix_socket)
    const listener = Deno.listen({ path: ipc_socket_filepath, transport: 'unix' })
    for await (const conn of listener) {
      const perf_start = performance.now()
      const bytes = await io.readAll(conn)
      const stringified = this.text_decoder.decode(bytes)
      const message: MessageContract = JSON.parse(stringified)
      await this.do_action(message.action)
      this.log_perf(`perf action '${message.action}'`, perf_start)
    }
  }
}

export { WallPalDaemon }
