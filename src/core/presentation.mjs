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
    footerThanks: "谢谢惠顾，欢迎明天继续改需求",
    transferAria: "传到手机导入联",
    transferTitle: "传到手机 · LOCAL TRANSFER",
    transferDescription: "主小票保持完整，这一联只负责打开小程序和搬运数据",
    openMiniProgram: "1 · 打开小程序",
    openMiniProgramHint: "微信扫码进入 AI 打工图鉴",
    importData: "2 · 扫描导入数据",
    importDataHint: "在小程序里点击“从电脑导入”后扫描",
    multipartOpenTitle: "先打开小程序",
    multipartOpenHint: "数据码将在 {seconds} 秒后自动开始轮播，无需点击电脑",
    multipartTransferTitle: "保持手机对准屏幕",
    multipartTransferHint: "数据码会自动逐张轮播；漏扫或重复都没关系",
    multipartPartLabel: "数据分片 {current}/{total}",
    multipartRestart: "重新显示小程序码",
    dataQrAlt: "当前小票数据二维码",
    miniProgramAlt: "微信小程序码",
    placeholderLabel: "小程序码",
    placeholderValue: "待接入",
    placeholderAria: "小程序码待接入",
    transferNote: "数据码只包含时间、轮次、Token和工具调用等统计，不包含Prompt、回复正文、代码、项目路径或文件名。",
    privacy: "结构数据同时保存在本机，未来可以批量导入小程序历史记录。",
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
    footerThanks: "Thanks for your business. More revisions welcome tomorrow.",
    transferAria: "Mobile transfer stub",
    transferTitle: "TO YOUR PHONE · LOCAL TRANSFER",
    transferDescription: "The main receipt stays intact. This stub only opens the mini program and transfers data.",
    openMiniProgram: "1 · Open mini program",
    openMiniProgramHint: "Scan with WeChat to open AI Work Archive",
    importData: "2 · Import receipt data",
    importDataHint: "Tap “从电脑导入小票” in the mini program, then scan this code",
    multipartOpenTitle: "Open the mini program first",
    multipartOpenHint: "The data codes will start rotating automatically in {seconds}s. No desktop click is required.",
    multipartTransferTitle: "Keep your phone pointed at the screen",
    multipartTransferHint: "Data codes rotate automatically. Missed or duplicate scans are safe.",
    multipartPartLabel: "Data part {current}/{total}",
    multipartRestart: "Show mini-program code again",
    dataQrAlt: "Current receipt data QR code",
    miniProgramAlt: "WeChat mini-program code",
    placeholderLabel: "Mini program",
    placeholderValue: "Pending",
    placeholderAria: "Mini-program code pending",
    transferNote: "The data code contains only statistics such as time, turns, Tokens, and tool calls. It does not contain prompts, responses, code, project paths, or file names.",
    privacy: "Structured data is also stored locally for future batch import into your mini-program history.",
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
