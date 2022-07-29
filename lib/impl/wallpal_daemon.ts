import * as fs from 'std/fs'
import * as io from "std/io"
import * as keypress from 'keypress/mod.ts'
import { WallPal, Action, DaemonData, FileInfo, MessageContract } from '/lib/impl/base.ts'


class WallPalDaemon extends WallPal {
  private interval: number | undefined
  private live_wallpaper_proc: Deno.Process | undefined
  private wallpaper_index = 0
  private wallpaper_dir: FileInfo[] = []

  public async do_action(action: Action) {
    switch(action) {
      case 'REFRESH':
        this.wallpaper_index = 0
        await this.load_wallpaper_dir()
        await this.set_wallpaper(this.wallpaper_index)
        break
      case 'NEXT':
        this.increment_index()
        await this.set_wallpaper(this.wallpaper_index)
        break
      case 'PREV':
        this.decrement_index()
        await this.set_wallpaper(this.wallpaper_index)
        break
    }

  }

  public async init() {
    await super.init()

    await this.load_config()

    // refresh on an interval
    this.interval = setInterval(() => {
      console.log(`Advancing wallpaper every ${this.config.interval_mins} minutes.`)
      this.do_action('NEXT')
    }, this.config.interval_mins * 60 * 1000)

    await Promise.all([
      this.launch_config_file_watcher(),
      this.launch_unix_socket_listener(),
      this.launch_keyboad_input_listener(),
    ])
    throw new Error('unexpected code path')
  }

  private async load_config() {
    const perf_start = performance.now()

    const daemon_file = this.resolve_path(this.config.daemon_file)
    const daemon_database = await fs.exists(daemon_file)
      .then(exists => exists
        ? Deno.readTextFile(daemon_file)
        : '{}')
      .then(JSON.parse)
    if (daemon_database?.wallpapers_dir === this.config.wallpapers_dir) {
      this.wallpaper_index = daemon_database.active_index
      await this.load_wallpaper_dir()
      await this.set_wallpaper(this.wallpaper_index)
    } else {
      await this.do_action('REFRESH')
    }

    this.log_perf(`initial refresh`, perf_start)
  }

  private async launch_config_file_watcher(): Promise<void> {
    let throttling = false
    console.log(`Edit ${this.config_file} to change the wallpapers folder.`)
    for await (const event of Deno.watchFs(this.resolve_path(this.config_file))) {
      if (event.kind === 'remove') return this.launch_config_file_watcher()
      if (throttling) continue
      throttling = true
      console.log('Config file changed, refreshing wallpaper.')
      this.config = await this.read_config(this.config_file)
      const load = this.load_config()
      const timeout = new Promise(resolve => setTimeout(resolve, 1000))
      Promise.all([load, timeout]).then(() => {
        throttling = false
      })
    }
    throw new Error('unexpected code path')
  }

  private async launch_unix_socket_listener() {
    const ipc_socket_filepath = this.resolve_path(this.config.ipc_unix_socket)
    const listener = Deno.listen({ path: ipc_socket_filepath, transport: 'unix' })
    for await (const conn of listener) {
      const perf_start = performance.now()
      const bytes = await io.readAll(conn)
      const stringified = this.text_decoder.decode(bytes)
      const message: MessageContract = JSON.parse(stringified)
      await this.do_action(message.action)
      this.log_perf(`action '${message.action}'`, perf_start)
    }
    throw new Error('unexpected code path')
  }

  private async launch_keyboad_input_listener() {
    console.log(`Use the arrow keys <- and -> to cycle through wallpapers.`)
    for await (const input of keypress.readKeypress()) {
      if (input.key === 'right') {
        console.log('Right arrow key pressed. Setting NEXT wallpaper.')
        this.do_action('NEXT')
      } else if (input.key === 'left') {
        console.log('Left arrow key pressed. Setting PREV wallpaper.')
        this.do_action('PREV')
      } else if (input.ctrlKey && input.key === 'c') {
        // NOTE: Deno.exit will not cancel the subprocesses (like live wallpapers)
        // see here https://github.com/denoland/deno/issues/8772
        this.live_wallpaper_proc?.kill('SIGKILL')
        Deno.exit(0)
      }
    }
    throw new Error('unexpected code path')
  }

  private get wallpaper_count() { return this.wallpaper_dir.length }
  private increment_index() {
    this.wallpaper_index = (this.wallpaper_index + 1) % this.wallpaper_count
  }

  private decrement_index() {
    this.wallpaper_index = (this.wallpaper_index - 1) % this.wallpaper_count
    if (this.wallpaper_index < 0)
      this.wallpaper_index = this.wallpaper_count + this.wallpaper_index
  }


  private async set_wallpaper(wallpaper_index: number) {
    const { path, mime_type } = this.wallpaper_dir[this.wallpaper_index]
    this.live_wallpaper_proc?.kill('SIGKILL')

    const data: DaemonData = {
      active_path: path,
      active_index: wallpaper_index,
      wallpapers_dir: this.config.wallpapers_dir,
    }

    if (mime_type === 'image/gif' || mime_type.startsWith('video')) {
      console.log(`setting animated wallpaper ${this.wallpaper_index + 1}/${this.wallpaper_count} ${path}`)
      await Deno.run({ cmd: ['xsetroot', '-solid', '#000000'] }).status()
      const cmd = [
        'mpv',
        '--wid=0',
        '--really-quiet',
        '--mute=yes',
        '--no-input-default-bindings',
        '--no-config',
        '--loop',
        path,
      ]
      const proc = Deno.run({ cmd })
      this.live_wallpaper_proc = proc
      proc.status().then(() => {
        // if the process completed, then we do not want to perform the kill() call above
        if (proc.pid == this.live_wallpaper_proc?.pid) this.live_wallpaper_proc = undefined
      })
    } else if (mime_type.startsWith('image')) {
      console.log(`setting wallpaper ${this.wallpaper_index + 1}/${this.wallpaper_count} ${path}`)
      await Deno.run({ cmd: ['feh', '--bg-max', path] }).status()
    } else {
      throw new Error(`Fatal: expected media mime types. Recieved ${mime_type}`)
    }
    await Deno.writeTextFile(this.resolve_path(this.config.daemon_file), JSON.stringify(data))
  }

  private async load_wallpaper_dir() {
    const walked_files: string[] = []
    const walk_iterator = fs.walk(this.resolve_path(this.config.wallpapers_dir), {
      followSymlinks: true,
    })
    for await (const { path, isFile } of walk_iterator) {
      if (isFile) walked_files.push(path)
    }
    if (this.config.random_order) {
      walked_files.sort(() => 0.5 - Math.random())
    }
    const wallpapers_file_info = []
    for (const path of walked_files) {
      const mime_proc = Deno.run({ cmd: ['file', '-b', '--mime-type', path], stdout: 'piped' })
      const mime_type = this.text_decoder.decode(await mime_proc.output()).trim()
      // console.log('mime', path, mime_type)
      wallpapers_file_info.push({ mime_type, path })
    }
    // TODO batch this. For now loading everything at once can cause it to stutter
    // const wallpaper_dir_promises = walked_files.map(async path => {
    //   const mime_proc = Deno.run({ cmd: ['file', '-b', '--mime-type', path], stdout: 'piped' })
    //   const mime_type = this.text_decoder.decode(await mime_proc.output()).trim()
    //   return { mime_type, path }
    // })
    // const wallpapers_file_info = await Promise.all(wallpaper_dir_promises)

    const wallpaper_dir = wallpapers_file_info.filter(
      f => f.mime_type.startsWith('image') || f.mime_type.startsWith('video')
    )

    if (wallpaper_dir.length === 0) {
      console.error(`No wallpapers found in ${this.config.wallpapers_dir}.`)
    } else this.wallpaper_dir = wallpaper_dir
  }
}

export { WallPalDaemon }
