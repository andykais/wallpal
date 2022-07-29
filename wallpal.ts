// std modules
import * as fs from 'std/fs'
import * as flags from 'std/flags'
import * as yaml from "std/encoding/yaml.ts";
// local imports
import { WallPalDaemon, WallPalClient, type Action } from '/lib/impl/mod.ts'

const CONFIG_FILE = '~/.config/wallpal.yaml'

const args = flags.parse(Deno.args)
const config_file = args['config-file'] || CONFIG_FILE
const [cmd] = args._
switch (cmd) {
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
    console.log(`Usage: wallpal <daemon | prev | next | refresh>

    --help     Print this message
    --config   Specify a config filepath`)
    Deno.exit(1)
}

