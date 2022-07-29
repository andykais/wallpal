// std modules
import * as fs from 'std/fs'
import * as yaml from "std/encoding/yaml.ts";


export interface ConfigurationFile {
  wallpapers_dir: string
  interval_mins: number
  daemon_port: number
  daemon_file: string
  ipc_unix_socket: string
  random_order: boolean
}
export interface FileInfo {
  mime_type: string
  path: string
}
export interface DaemonData {
  active_path: string
  active_index: number
  wallpapers_dir: string
}
export type Action =
  | 'REFRESH'
  | 'NEXT'
  | 'PREV'
export interface MessageContract {
  action: Action
}

const CONFIG: ConfigurationFile = {
  wallpapers_dir: '~/Pictures/wallpapers',
  interval_mins: 60,
  daemon_port: 4500,
  daemon_file: '~/.cache/wallpal_current_wallpaper.json',
  ipc_unix_socket: '~/.cache/wallpal.sock',
  random_order: false,
}


abstract class WallPal {
  private home = Deno.env.get('HOME')!
  protected daemon_file: string
  protected config!: ConfigurationFile
  protected text_decoder = new TextDecoder()
  protected text_encoder = new TextEncoder()

  public constructor(protected config_file: string) {
    this.daemon_file = '~/.cache/wallpal_current_wallpaper.json'
  }

  public abstract do_action(action: Action): Promise<void>

  public async init() {
    this.config = await this.read_config(this.config_file)
  }

  protected resolve_path(path: string) {
    return path.replace('~', this.home)
  }

  protected async read_config(config_file: string) {
    const filepath = this.resolve_path(this.config_file)
    const file_contents = await Deno.readTextFile(filepath)
    const parsed_contents = yaml.parse(file_contents) as Partial<ConfigurationFile>
    const merged_config = {...CONFIG, ...parsed_contents}
    return merged_config
  }

  protected log_perf(name: string, perf_start_ms: number) {
    const duration_ms = performance.now() - perf_start_ms
    console.log(`perf: ${name} took ${duration_ms} ms`)
  }
}

export { WallPal }
