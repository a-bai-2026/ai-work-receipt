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

> 票仔，开最近三个小时的票。

> 票仔，开最近几个小时的票。

> 生成我最近七天的 AI 打工小票。

> 看看本周 Codex 一共打了多少工。

> 用英文生成刚刚这次工作的 AI 打工小票。

Codex 会根据表达选择单次会话、最近 1～168 小时、今天、近七日或本周，以及语言和主题，然后执行命令并打开生成的网页。“最近几个小时”默认统计最近 3 小时。

如果当前 Codex 任务仍在运行，而你希望立刻查看小票，建议新开一个本地 Codex 会话再说“开今天的票”；在当前运行会话中发送的消息可能根据 Follow-up behavior 被用于 Steer 或 Queue。

也可以通过 `$ai-work-receipt` 显式调用这个 Skill。

桌宠安装和使用见 [Codex 桌宠“票仔”](codex-pet.md)。

## 更新

重新运行安装命令即可安全覆盖旧版本：

```bash
npx codex-work-receipt@latest --install-skill
```
