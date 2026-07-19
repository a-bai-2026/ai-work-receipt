# Ticket Buddy Codex Pet

<p><a href="./codex-pet.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

“Ticket Buddy · AI Work Receipt” is a custom companion for Codex's native Pets feature. It is a night-green thermal receipt printer with tiny ox horns and animated idle, working, waiting, ready, failed, and review states.

Ticket Buddy only presents Codex activity and provides companionship. It does not collect extra data, generate receipts automatically, or alter the current task. Receipt generation continues through the AI Work Receipt skill.

## Install the skill and pet together

```bash
npx codex-work-receipt@latest --install-companion --lang en
```

After installation:

1. Restart Codex.
2. Open `Settings > Pets`.
3. Select Refresh.
4. Choose “票仔 · AI 小票工” (Ticket Buddy).
5. Use `/pet` to wake it.

Then ask:

> Ticket Buddy, create today's receipt.

> Ticket Buddy, create a receipt for the latest session.

> Ticket Buddy, create a receipt for the last three hours.

“The last few hours” defaults to three hours.

## Install or remove only the pet

```bash
npx codex-work-receipt@latest --install-pet --lang en
```

```bash
npx codex-work-receipt@latest --uninstall-pet --lang en
```

Removal only deletes `~/.codex/pets/ai-work-receipt/`. It leaves the skill, saved receipts, and other pets untouched.

## States

- Idle: quiet breathing and blinking.
- Running: focused button work shows that Codex is executing a task.
- Needs input: an open paw and head tilt show that Codex needs approval, a choice, or an answer.
- Ready: the pet scans the attached receipt to show that the task is complete and waiting for review.
- Failed or blocked: the pet looks deflated.
- Movement: separate leftward and rightward walking loops follow its movement direction.

Codex automatically controls state transitions and movement direction; a command cannot select an individual action row. A custom pet currently supplies only its name, description, and animation atlas. Selecting the pet returns to Codex or opens activity; it cannot run the receipt CLI directly.

## Availability

- Codex desktop app: floating companion and activity states.
- Codex CLI: terminal pets in compatible iTerm2, Kitty Graphics, or Sixel terminals.
- Codex IDE extension: no pet picker or floating pet overlay currently.
