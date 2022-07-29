
export interface ConfigurationFile {
  wallpapers_dir: string
  interval_mins: number
  daemon_port: number
  daemon_file: string
  ipc_unix_socket: string
  random_order: boolean
}

const DEFAULT_CONFIG: ConfigurationFile = {
  wallpapers_dir: '~/Pictures/wallpapers',
  interval_mins: 60,
  daemon_port: 4500,
  daemon_file: '~/.cache/wallpal_current_wallpaper.json',
  ipc_unix_socket: '~/.cache/wallpal.sock',
  random_order: false,
}

export { DEFAULT_CONFIG }
