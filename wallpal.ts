// std modules
import * as fs from 'std/fs'
import * as flags from 'std/flags'
import * as yaml from "std/encoding/yaml.ts";
// local imports
import { WallPalDaemon, WallPalClient, type Action } from '/lib/impl/mod.ts'
import { DEFAULT_CONFIG } from '/lib/config.ts'

const CONFIG_FILE = '~/.config/wallpal.yaml'

const args = flags.parse(Deno.args)
const config_file = args['config-file'] || CONFIG_FILE
const [cmd] = args._
switch (cmd) {
  case 'init': {
    const wallpal = new WallPalClient(config_file)
    await Deno.writeTextFile(wallpal.resolve_path(config_file), yaml.stringify(DEFAULT_CONFIG))
    console.log(`Initialized default config ${config_file}`)
    break
  }
  case 'daemon': {
    const wallpal = new WallPalDaemon(config_file)
    await wallpal.init()
    break
  }
  case 'next':
  case 'prev':
  case 'refresh': {
    const wallpal = new WallPalClient(config_file)
    await wallpal.init()
    await wallpal.do_action(cmd.toUpperCase() as Action)
    break
  }
  default:
    console.log(`Usage: wallpal <daemon | prev | next | refresh | init>

    COMMANDS:
      init       Initialize a default config file. Use the --config arg to specify a location to initialize the file.
      daemon     Start the wallpal daemon to cycle through wallpapers in the configured folder
      next       Cycle to the next wallpaper in the folder. Note that the daemon must be running to use this command.
      prev       Cycle to the previous wallpaper in the folder. Note that the daemon must be running to use this command.
      refresh    Refresh the loaded wallpaper list for a directory. Note that the daemon must be running to use this command.

    OPTIONS:
      --help     Print this message
      --config   Specify a config filepath`)
    Deno.exit(1)
}

