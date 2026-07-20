# Codex 桌宠“票仔”

<p><strong>中文</strong> · <a href="./codex-pet.en.md">English</a> · <a href="../README.md">返回 README</a></p>

“票仔 · AI 小票工”是 AI 打工小票为 Codex 原生 Pets 功能制作的自定义桌宠。它是一台长着小牛角的夜班绿热敏打印机，会跟随 Codex 的空闲、工作、等待、完成和失败状态切换动画。

票仔只负责状态展示和陪伴，不会自动读取额外数据、生成小票或改变 Codex 的任务。开票仍然通过 AI 打工小票 Skill 完成。

## 一次安装 Skill 和票仔

```bash
npx codex-work-receipt@latest --install-companion
```

安装完成后：

1. 重启 Codex。
2. 打开 `Settings > Pets`。
3. 点击 Refresh。
4. 选择“票仔 · AI 小票工”。
5. 输入 `/pet` 唤醒票仔。

以后可以直接说：

> 票仔，开今天的票。

> 票仔，开最近一个会话的票。

> 票仔，开最近三个小时的票。

“最近几个小时”默认表示最近 3 小时。

最近 N 小时小票是私人滚动摘要，不进入 AI 供销社；需要参与供销社统计时，请让票仔生成今日、本周、近七日或指定会话小票。

## 只安装或卸载桌宠

只安装票仔：

```bash
npx codex-work-receipt@latest --install-pet
```

卸载票仔：

```bash
npx codex-work-receipt@latest --uninstall-pet
```

卸载只会删除 `~/.codex/pets/ai-work-receipt/`，不会删除 Skill、历史小票或其他宠物。

## 状态

- 空闲：安静呼吸和眨眼。
- 正在打工：专注操作打印按钮，表示 Codex 正在执行任务。
- 等你确认：抬手并歪头等待，表示 Codex 需要批准、选择或回答。
- 任务完成：查看票纸并左右扫视，表示任务已经完成、等待你回来查看。
- 失败或阻塞：小票工露出沮丧表情。
- 左右移动：根据移动方向播放对应步行动画。

Codex 会自动决定状态和移动方向，不能通过命令指定播放某一行动画。当前自定义 Pet 只能提供名称、描述和动画图集；点击票仔会返回 Codex 或打开活动列表，不能改成直接运行 CLI。

## 使用范围

- Codex 桌面端：支持悬浮桌宠和活动状态。
- Codex CLI：在支持 iTerm2、Kitty Graphics 或 Sixel 的终端里提供终端宠物。
- Codex IDE 扩展：当前不提供宠物选择器或悬浮桌宠。
