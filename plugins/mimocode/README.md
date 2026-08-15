# revdiff MiMoCode integration

## Prerequisites

- [revdiff](https://github.com/umputun/revdiff) installed and in `PATH`
- One of the supported terminals: Ghostty, tmux, Kitty, WezTerm, cmux, iTerm2, Emacs vterm

## Files

```
~/.config/mimocode/
├── commands/
│   └── revdiff.md
├── tools/
│   ├── revdiff.ts
│   └── launch-revdiff.sh
└── plugin/
    ├── revdiff-plan-review.ts
    └── launch-plan-review.sh
```

## Installation

```sh
bash setup.sh
```

The script creates the target directories if needed and copies all files, marking the shell scripts as executable. Unlike the OpenCode plugin, no config registration is needed — MiMoCode auto-discovers `tools/`, `commands/` and `plugin/` under its config dir. Or manually:

```sh
mkdir -p ~/.config/mimocode/tools ~/.config/mimocode/commands ~/.config/mimocode/plugin
cp ../../.claude-plugin/skills/revdiff/scripts/launch-revdiff.sh ~/.config/mimocode/tools/
chmod +x ~/.config/mimocode/tools/launch-revdiff.sh
cp ../revdiff-planning/scripts/launch-plan-review.sh ~/.config/mimocode/plugin/
chmod +x ~/.config/mimocode/plugin/launch-plan-review.sh
cp commands/revdiff.md ~/.config/mimocode/commands/
cp tools/revdiff.ts ~/.config/mimocode/tools/
cp plugin/revdiff-plan-review.ts ~/.config/mimocode/plugin/
```

Restart MiMoCode after installing — the tool, command, and plan-review plugin are discovered at startup.

The tool and plan-review plugin set `REVDIFF_EXIT_CODE_ON_ANNOTATIONS`; exit `10` is success-with-annotations and captured stdout is still processed. Other nonzero statuses remain failures.

The plan-review plugin hooks `session.idle`: after a turn in plan mode (agent `plan`), it launches revdiff over the last plan and injects any annotations back as a user message so the agent can revise.
