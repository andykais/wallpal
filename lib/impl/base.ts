// std modules
import * as fs from 'std/fs'
import * as yaml from "https://deno.land/std@0.149.0/encoding/yaml.ts";
// community modules
import { listen } from 'https://deno.land/std@0.149.0/_deno_unstable.ts';


export interface ConfigurationFile {
  wallpapers_dir: string
  interval_mins: number
  daemon_port: number
  daemon_file: string
  ipc_unix_socket: string
  random_order: boolean
}
export type FileInfo = { mime_type: string; path: string }
export type DaemonData = { active_path: string; active_index: number; wallpapers_dir: string }
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

  public constructor(private config_file: string) {
    this.daemon_file = '~/.cache/wallpal_current_wallpaper.json'
  }

  abstract do_action(action: Action): Promise<void>

  public async init() {
    const filepath = this.resolve_path(this.config_file)
    const file_contents = await Deno.readTextFile(filepath)
    const parsed_contents = yaml.parse(file_contents) as Partial<ConfigurationFile>
    const merged_config = {...CONFIG, ...parsed_contents}
    this.config = merged_config
    console.log(this.config)
  }

  protected resolve_path(path: string) {
    return path.replace('~', this.home)
  }

  protected log_perf(name: string, perf_start_ms: number) {
    const duration_ms = performance.now() - perf_start_ms
    console.log(`${name} took ${duration_ms} ms`)
  }
}

export { WallPal }
