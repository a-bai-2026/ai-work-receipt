export const DEFAULT_LOCALE = "zh-CN";
export const SUPPORTED_LOCALES = new Set([DEFAULT_LOCALE, "en"]);

const WORK_PROFILES = {
  "change-request-survivor": {
    "zh-CN": {
      title: "改需求幸存者",
      review: "方向改了又改，但它还是把工牌戴稳了。",
    },
    en: {
      title: "Change Request Survivor",
      review: "The direction changed again and again, but the badge stayed firmly on.",
    },
  },
  "toolchain-commander": {
    "zh-CN": {
      title: "工具链指挥官",
      review: "今天不是在调用工具，就是在去调用工具的路上。",
    },
    en: {
      title: "Toolchain Commander",
      review: "It was either calling tools or on its way to call another one.",
    },
  },
  "context-devouring-beast": {
    "zh-CN": {
      title: "上下文吞吐兽",
      review: "一口气吞下大量上下文，脑内风扇疑似起飞。",
    },
    en: {
      title: "Context-Devouring Beast",
      review: "It swallowed a massive context window in one sitting. Internal fans may have achieved liftoff.",
    },
  },
  "continuous-delivery-machine": {
    "zh-CN": {
      title: "连续交付机器",
      review: "一轮接一轮地干活，像被塞进了自动售货机。",
    },
    en: {
      title: "Continuous Delivery Machine",
      review: "Turn after turn, it kept shipping like a vending machine stocked with deliverables.",
    },
  },
  "night-shift-companion": {
    "zh-CN": {
      title: "深夜陪跑员工",
      review: "人类还没下班，它也只好继续亮着屏幕。",
    },
    en: {
      title: "Night Shift Companion",
      review: "The human was still online, so the screen had no choice but to stay lit.",
    },
  },
  "steady-progress-partner": {
    "zh-CN": {
      title: "稳定推进搭子",
      review: "不声不响往前推，属于靠谱但不邀功的那种。",
    },
    en: {
      title: "Steady Progress Partner",
      review: "Quietly moved the work forward—the reliable type that never asks for applause.",
    },
  },
  "temporary-hire": {
    "zh-CN": {
      title: "临时上岗小工",
      review: "刚打完卡，还没来得及形成职场人格。",
    },
    en: {
      title: "Temporary Hire",
      review: "It just clocked in. Its workplace personality is still loading.",
    },
  },
};

const RECEIPT_COPY = {
  "zh-CN": {
    htmlLang: "zh-CN",
    pageTitle: "Codex AI 打工小票",
    receiptTitle: "AI 打工小票",
    themeAria: "小票主题",
    exportImage: "保存完整长图",
    exportingImage: "正在生成…",
    exportSuccess: "图片已保存",
    exportError: "图片生成失败，请重试",
    receiptAria: "Codex AI 打工小票",
    sidebar: {
      aria: "相关信息",
      supportTitle: "支持项目",
      supportDescription: "喜欢这个工具？",
      changelogTitle: "更新日志",
      changelogLink: "查看更新日志 →",
      sponsorLabel: "赞助伙伴",
      sponsorAlt: "ModelFlare 标志",
      features: {
        title: "更多小票功能",
        countLabel: "{count} 项",
        description: "复制命令后，在终端中运行即可。",
        copyLabel: "复制",
        copiedLabel: "已复制",
        copyErrorLabel: "复制失败",
        copiedStatus: "命令已复制到剪贴板",
        copyErrorStatus: "无法自动复制，请手动选择命令",
        groups: [
          {
            title: "生成小票",
            commands: [
              { label: "生成最近一次小票", args: "--latest" },
              { label: "生成最近 3 小时小票", args: "--hours 3" },
              { label: "生成今日小票", args: "--today" },
              { label: "生成最近 7 天小票", args: "--range last-7-days" },
              { label: "生成本周小票", args: "--range this-week" },
            ],
          },
          {
            title: "自动与手动",
            commands: [
              { label: "重新选择工作模式", args: "--setup" },
              { label: "开启自动保存", args: "--enable-auto" },
              { label: "切换为仅手动", args: "--disable-auto" },
              { label: "查看自动保存状态", args: "--auto-status" },
            ],
          },
          {
            title: "票仔与对话开票",
            commands: [
              { label: "安装票仔和对话开票", args: "--install-companion" },
              { label: "仅安装票仔", args: "--install-pet" },
              { label: "仅安装对话开票", args: "--install-skill" },
            ],
          },
        ],
      },
    },
    themes: {
      classic: "经典白票",
      diner: "复古粉票",
      payroll: "夜班绿票",
    },
    scope: {
      latest: "最近一次会话",
      session: "指定会话",
      "last-hours": "最近 {hours} 小时",
      today: "今日全部会话",
      "last-7-days": "最近 7 个自然日",
      "this-week": "本周全部会话",
    },
    modelMissing: "未记录",
    meta: {
      date: "日期",
      hours: "营业时段",
      period: "统计周期",
      number: "小票编号",
      timezone: "时区",
    },
    rows: {
      scope: "统计范围",
      sessions: "会话数量",
      turns: "完成轮次",
      messages: "用户消息",
      tools: "工具调用",
      tokens: "消耗 Token",
      cachedTokens: "其中缓存输入",
      interruptions: "被人类打断",
      firstResponse: "平均首次响应",
      duration: "AI 工作时长",
    },
    units: {
      sessions: ["场", "场"],
      turns: ["轮", "轮"],
      messages: ["条", "条"],
      tools: ["次", "次"],
      interruptions: ["次", "次"],
      seconds: ["秒", "秒"],
    },
    insights: {
      title: "效率与工作结构",
      cacheHit: "缓存命中率",
      perTurn: "每轮效率",
      totalTokens: "总 Token",
      outputTokens: "输出 Token",
      toolCalls: "工具调用",
      firstTokenLatency: "首次响应延迟",
      turnLatency: "整轮耗时",
      p50: "P50",
      p90: "P90",
      noSamples: "暂无样本",
      heatmap: "工作时间热力图",
      heatmapCell: "{hour}:00 · {count} 轮",
      models: "模型结构",
      tools: "工具结构",
      turnsUnit: "轮",
      callsUnit: "次",
      toolCategories: {
        terminal: "终端命令",
        "file-edit": "文件编辑",
        browser: "浏览器操作",
        research: "检索研究",
        media: "图像与媒体",
        agents: "多代理协作",
        planning: "规划与确认",
        integrations: "外部集成",
        other: "其他工具",
      },
    },
    footerThanks: "谢谢惠顾，欢迎明天继续改需求",
    transferAria: "微信小程序导入联",
    transferTitle: "导入到微信小程序",
    transferDescription: "下载脱敏数据文件，通过微信聊天文件导入",
    openMiniProgram: "打开小程序",
    openMiniProgramHint: "微信扫码进入 AI 打工图鉴",
    fileImportTitle: "从聊天文件导入",
    fileImportSteps: [
      "下载微信导入文件",
      "把文件发送到“文件传输助手”或自己的聊天",
      "在小程序中点击“从聊天文件导入”并选择该文件",
    ],
    downloadFile: "下载微信导入文件",
    downloadFileHint: "下载后发送到文件传输助手",
    downloadSuccess: "文件已下载，请发送到微信文件传输助手",
    downloadError: "文件下载失败，请重试",
    fileImportPrivacy: "文件只包含脱敏统计。发送到聊天前，请确认接收方可信。",
    scanAlternativeTitle: "也可以扫码导入",
    scanAlternativeHint: "这份数据可以由一个二维码完整承载",
    showDataQr: "显示数据二维码",
    showMiniProgramCode: "返回小程序码",
    dataQrTitle: "扫描导入数据",
    dataQrHint: "在小程序中选择扫码导入后扫描",
    dataQrAlt: "当前小票数据二维码",
    miniProgramAlt: "微信小程序码",
    exportMiniProgramLabel: "微信扫码打开小程序",
    placeholderLabel: "小程序码",
    placeholderValue: "待接入",
    placeholderAria: "小程序码待接入",
    transferNote: "导入文件和可选数据码只包含时间、轮次、Token 和工具调用等统计，不包含 Prompt、回复正文、代码、项目路径或文件名。",
    rollingSummaryNotice: "最近 {hours} 小时属于滚动摘要，只保存到私人历史，不参与 AI 供销社统计。需要统计时请生成“今日 / 本周 / 近 7 日 / 指定会话”小票。",
    privacy: "结构数据和微信导入文件同时保存在本机；只有你主动发送文件或扫码时，脱敏统计才会离开电脑。",
  },
  en: {
    htmlLang: "en",
    pageTitle: "Codex AI Work Receipt",
    receiptTitle: "AI Work Receipt",
    themeAria: "Receipt theme",
    exportImage: "Save full PNG",
    exportingImage: "Rendering…",
    exportSuccess: "Image saved",
    exportError: "Could not generate the image. Please try again.",
    receiptAria: "Codex AI Work Receipt",
    sidebar: {
      aria: "Related information",
      supportTitle: "Support the project",
      supportDescription: "Enjoying this tool?",
      changelogTitle: "Changelog",
      changelogLink: "View the changelog →",
      sponsorLabel: "Sponsored by",
      sponsorAlt: "ModelFlare logo",
      features: {
        title: "More receipt features",
        countLabel: "{count} commands",
        description: "Copy a command, then run it in your terminal.",
        copyLabel: "Copy",
        copiedLabel: "Copied",
        copyErrorLabel: "Copy failed",
        copiedStatus: "Command copied to the clipboard",
        copyErrorStatus: "Could not copy automatically. Select the command manually.",
        groups: [
          {
            title: "Generate receipts",
            commands: [
              { label: "Generate the latest receipt", args: "--latest" },
              { label: "Generate the last 3 hours", args: "--hours 3" },
              { label: "Generate today's receipt", args: "--today" },
              { label: "Generate the last 7 days", args: "--range last-7-days" },
              { label: "Generate this week's receipt", args: "--range this-week" },
            ],
          },
          {
            title: "Automatic and manual",
            commands: [
              { label: "Choose a working mode", args: "--setup" },
              { label: "Enable automatic saving", args: "--enable-auto" },
              { label: "Switch to manual only", args: "--disable-auto" },
              { label: "Check automatic saving", args: "--auto-status" },
            ],
          },
          {
            title: "Ticket Buddy and chat commands",
            commands: [
              { label: "Install Ticket Buddy and chat commands", args: "--install-companion" },
              { label: "Install Ticket Buddy only", args: "--install-pet" },
              { label: "Install chat commands only", args: "--install-skill" },
            ],
          },
        ],
      },
    },
    themes: {
      classic: "Classic White",
      diner: "Vintage Pink",
      payroll: "Night Shift Green",
    },
    scope: {
      latest: "Latest session",
      session: "Selected session",
      "last-hours": "Last {hours} hours",
      today: "All sessions today",
      "last-7-days": "Last 7 calendar days",
      "this-week": "All sessions this week",
    },
    modelMissing: "Not recorded",
    meta: {
      date: "Date",
      hours: "Work hours",
      period: "Period",
      number: "Receipt No.",
      timezone: "Timezone",
    },
    rows: {
      scope: "Scope",
      sessions: "Sessions",
      turns: "Completed turns",
      messages: "User messages",
      tools: "Tool calls",
      tokens: "Tokens used",
      cachedTokens: "Cached input",
      interruptions: "Human interruptions",
      firstResponse: "Average first response",
      duration: "AI work duration",
    },
    units: {
      sessions: ["session", "sessions"],
      turns: ["turn", "turns"],
      messages: ["message", "messages"],
      tools: ["call", "calls"],
      interruptions: ["time", "times"],
      seconds: ["sec", "sec"],
    },
    insights: {
      title: "Efficiency & work structure",
      cacheHit: "Cache hit rate",
      perTurn: "Per-turn efficiency",
      totalTokens: "total Tokens",
      outputTokens: "output Tokens",
      toolCalls: "tool calls",
      firstTokenLatency: "First-token latency",
      turnLatency: "Full-turn duration",
      p50: "P50",
      p90: "P90",
      noSamples: "No samples",
      heatmap: "Work-time heatmap",
      heatmapCell: "{hour}:00 · {count} turns",
      models: "Model structure",
      tools: "Tool structure",
      turnsUnit: "turns",
      callsUnit: "calls",
      toolCategories: {
        terminal: "Terminal",
        "file-edit": "File editing",
        browser: "Browser",
        research: "Research",
        media: "Image & media",
        agents: "Multi-agent",
        planning: "Planning",
        integrations: "Integrations",
        other: "Other tools",
      },
    },
    footerThanks: "Thanks for your business. More revisions welcome tomorrow.",
    transferAria: "WeChat mini-program import stub",
    transferTitle: "IMPORT INTO WECHAT",
    transferDescription: "Download the privacy-safe data file and import it from a WeChat chat.",
    openMiniProgram: "Open mini program",
    openMiniProgramHint: "Scan with WeChat to open AI Work Archive",
    fileImportTitle: "Import from a chat file",
    fileImportSteps: [
      "Download the WeChat import file",
      "Send it to File Transfer or one of your own chats",
      "Tap “Import from chat file” in the mini program and select it",
    ],
    downloadFile: "Download WeChat import file",
    downloadFileHint: "Then send it to WeChat File Transfer",
    downloadSuccess: "File downloaded. Send it to WeChat File Transfer.",
    downloadError: "Could not download the file. Please try again.",
    fileImportPrivacy: "The file contains privacy-safe metrics only. Send it only to a chat you trust.",
    scanAlternativeTitle: "Or import by scanning",
    scanAlternativeHint: "This receipt fits completely in one data QR code.",
    showDataQr: "Show data QR code",
    showMiniProgramCode: "Back to mini-program code",
    dataQrTitle: "Scan to import data",
    dataQrHint: "Choose scan import in the mini program, then scan this code",
    dataQrAlt: "Current receipt data QR code",
    miniProgramAlt: "WeChat mini-program code",
    exportMiniProgramLabel: "Scan to open the mini program",
    placeholderLabel: "Mini program",
    placeholderValue: "Pending",
    placeholderAria: "Mini-program code pending",
    transferNote: "The import file and optional data code contain only statistics such as time, turns, Tokens, and tool calls. They do not contain prompts, responses, code, project paths, or file names.",
    rollingSummaryNotice: "The last {hours} hours is a rolling summary for private history only. It does not participate in AI Work Cooperative accounting. Use today, this week, the last seven days, or a specific session for accountable facts.",
    privacy: "Structured data and the WeChat import file stay on this computer until you explicitly send the file or scan its data code.",
  },
};

const COMPENSATION_COPY = {
  "zh-CN": {
    latest: "本单工资",
    session: "本单工资",
    "last-hours": "本段工资",
    today: "本日工资",
    "last-7-days": "近七日工资",
    "this-week": "本周工资",
    unit: "AI 工分",
    note: "按轮次、工具调用、Token 和改需求次数娱乐折算，不代表真实费用。",
  },
  en: {
    latest: "SHIFT PAY",
    session: "SHIFT PAY",
    "last-hours": "WINDOW PAY",
    today: "TODAY'S PAY",
    "last-7-days": "7-DAY PAY",
    "this-week": "THIS WEEK'S PAY",
    unit: "AI work pts",
    note: "A playful score based on turns, tool calls, Tokens, and interruptions. Not a real charge.",
  },
};

export function selectWorkProfileId(metrics) {
  const scale = Math.max(1, Number(metrics.activeDayCount || 1));
  if (metrics.interruptions >= 3 * scale) return "change-request-survivor";
  if (metrics.toolCalls >= 40 * scale) return "toolchain-commander";
  if (metrics.tokens.total_tokens >= 500_000 * scale) return "context-devouring-beast";
  if (metrics.completedTurns >= 12 * scale) return "continuous-delivery-machine";
  if (metrics.workDurationMs >= 60 * 60 * 1000 * scale) return "night-shift-companion";
  if (metrics.completedTurns >= 5 * scale) return "steady-progress-partner";
  return "temporary-hire";
}

export function getWorkProfileCopy(profileId, locale = DEFAULT_LOCALE) {
  const profile = WORK_PROFILES[profileId] || WORK_PROFILES["temporary-hire"];
  return profile[SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE];
}

export function getReceiptCopy(locale = DEFAULT_LOCALE) {
  return RECEIPT_COPY[SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE];
}

export function getScopeLabel(scope, locale = DEFAULT_LOCALE, hours = null) {
  const template = getReceiptCopy(locale).scope[scope] || getReceiptCopy(locale).scope.latest;
  return String(template).replaceAll("{hours}", String(hours || 3));
}

export function getRollingSummaryNotice(locale = DEFAULT_LOCALE, hours = null) {
  return String(getReceiptCopy(locale).rollingSummaryNotice).replaceAll("{hours}", String(hours || 3));
}

export function buildCompensation(scope, amount, locale = DEFAULT_LOCALE) {
  const copy = COMPENSATION_COPY[SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE];
  return {
    label: copy[scope] || copy.latest,
    amount: Number(amount || 0),
    unit: copy.unit,
    note: copy.note,
    formula_version: "work_points_v1",
  };
}
