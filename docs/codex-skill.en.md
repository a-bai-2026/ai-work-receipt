# Codex Skill

<p><a href="./codex-skill.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

AI Work Receipt includes a Codex Skill that converts natural-language requests into the appropriate CLI options.

The skill remains a manual receipt entry point in either saving mode. With automatic saving enabled, you can still ask Codex for another range such as the latest session or this week. Manual-only mode does not disable the skill. Configure automatic saving with `npx codex-work-receipt@latest --setup --lang en`; see [automatic saving in the CLI guide](cli.en.md#automatic-saving).

## Install

```bash
npx codex-work-receipt@latest --install-skill --lang en
```

The skill is installed at:

```text
~/.agents/skills/ai-work-receipt/
```

It does not modify the current repository. Restart Codex if the current session does not detect the newly installed skill.

## Use

After installation, ask Codex:

> Create an AI work receipt for my latest Codex session.

> Generate today's AI work receipt with the diner theme.

> Ticket Buddy, create a receipt for the last three hours.

> Ticket Buddy, create a receipt for the last few hours.

> Generate an AI work receipt for the last seven days.

> Show how much Codex worked this week.

> Create a Chinese receipt for my latest session.

Codex will choose a specific session, the last 1-168 hours, today, the last seven days, or this week, plus the language and theme, then run the CLI and open the generated page. “The last few hours” defaults to three hours.

If another Codex task is still running and you want the receipt immediately, start a separate local Codex chat. A message sent to the active chat may steer the current run or wait in its queue, depending on Follow-up behavior.

You can also invoke the skill explicitly with `$ai-work-receipt`.

See [Ticket Buddy Codex pet](codex-pet.en.md) for the companion setup.

## Update

Run the installation command again to safely replace an older version:

```bash
npx codex-work-receipt@latest --install-skill --lang en
```
