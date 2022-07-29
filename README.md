# Wallpal

## Requirements
- linux, X11. Mac support is WIP
- `deno` >= `v1.124.0`
- `xsetroot`, `mpv` (for live wallpapers)
- `feh` (for static wallpapers)

## Installation
```bash
deno install --unstable --allow-read --allow-write --allow-env=HOME --allow-run --no-prompt -f wallpal.ts
```

## Usage
```bash
# initialize a config
wallpal init

# start the daemon
wallpal daemon
```

```bash
# optionally, send it commands from a different terminal
wallpal next
wallpal prev
wallpal refresh
```

### i3
Personally, I use this script as a wallpaper cycler for my i3 desktop. The my `~/.config/i3/config` looks something like this:
```i3config
# start wallpal upon login
exec --no-startup-id wallpal daemon

# quickly move to the next/prev wallpaper with Win+Alt+Left and Win+Alt+Right
bindsym $mod+Mod1+Left exec wallpal prev
bindsym $mod+Mod1+Right exec wallpal next
```
