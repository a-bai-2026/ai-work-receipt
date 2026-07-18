# Codex Skill

<p><strong>中文</strong> · <a href="./codex-skill.en.md">English</a> · <a href="../README.md">返回 README</a></p>

AI 打工小票内置了一个 Codex Skill，让 Codex 可以根据自然语言替你选择参数并运行 CLI。

## 安装

```bash
npx codex-work-receipt@latest --install-skill
```

Skill 会安装到：

```text
~/.agents/skills/ai-work-receipt/
```

它不会修改当前代码仓库。如果当前会话没有识别到新 Skill，请重启 Codex。

## 使用

安装后可以直接说：

> 给刚刚这次工作开一张 AI 打工小票。

> 生成我今天的 AI 打工小票，使用复古粉票。

> 用英文生成刚刚这次工作的 AI 打工小票。

Codex 会根据表达选择 `--latest` 或 `--today`、语言和主题，然后执行命令并打开生成的网页。

也可以通过 `$ai-work-receipt` 显式调用这个 Skill。

## 更新

重新运行安装命令即可安全覆盖旧版本：

```bash
npx codex-work-receipt@latest --install-skill
```
