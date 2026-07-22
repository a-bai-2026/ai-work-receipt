import { normalizeScope } from "./range.mjs";

export function printHelp(locale = "zh-CN") {
  console.log(locale === "en" ? `
Codex AI Work Receipt

Usage:
  npx codex-work-receipt@latest
  npx codex-work-receipt@latest --latest --lang en
  npx codex-work-receipt@latest --hours 3 --lang en
  npx codex-work-receipt@latest --today --lang en
  npx codex-work-receipt@latest --range last-7-days --lang en
  npx codex-work-receipt@latest --range this-week --lang en
  npx codex-work-receipt@latest --install-skill --lang en
  npx codex-work-receipt@latest --install-companion --lang en
  npx codex-work-receipt@latest --setup --lang en

Options:
  --range <name>              Range: latest, last-hours, today, last-7-days, this-week
  --hours <number>            Summarize the last 1-168 hours
  --latest                    Summarize the latest active Codex session (default)
  --today                     Summarize all Codex activity from today
  --session <id>              Summarize one specific Codex session
  --timezone <name>           Use an IANA timezone, for example Asia/Shanghai
  --lang <name>               Receipt language: zh-CN, en
  --theme <name>              Default theme: classic, diner, payroll
  --output <file>             Set the generated HTML path
  --data-dir <directory>      Set the local structured-history directory
  --install-skill             Install the natural-language Codex skill
  --install-pet               Install the Codex pet only
  --uninstall-pet             Remove the installed Codex pet
  --install-companion         Install both the skill and Codex pet
  --setup                     Choose automatic saving or manual-only mode
  --enable-auto               Enable automatic daily receipt saving
  --disable-auto              Switch to manual-only mode
  --auto-status               Show automatic saving status
  --no-open                   Do not open the browser after generation
  --help                      Show help
` : `
Codex AI 打工小票

用法：
  npx codex-work-receipt@latest
  npx codex-work-receipt@latest --latest
  npx codex-work-receipt@latest --hours 3
  npx codex-work-receipt@latest --today
  npx codex-work-receipt@latest --range last-7-days
  npx codex-work-receipt@latest --range this-week
  npx codex-work-receipt@latest --install-skill
  npx codex-work-receipt@latest --install-companion
  npx codex-work-receipt@latest --setup

选项：
  --range <name>              统计范围：latest、last-hours、today、last-7-days、this-week
  --hours <number>            统计最近 1～168 小时
  --latest                    统计最近活跃的 Codex 会话（默认）
  --today                     统计本地时区今天发生的全部 Codex 活动
  --session <id>              统计指定的 Codex 会话
  --timezone <name>           指定 IANA 时区，例如 Asia/Shanghai
  --lang <name>               小票语言：zh-CN、en
  --theme <name>              默认主题：classic、diner、payroll
  --output <file>             指定生成的 HTML 文件，默认写入 ./codex-work-receipt-output/
  --data-dir <directory>      指定本地结构数据目录
  --install-skill             安装可通过自然语言调用的 Codex Skill
  --install-pet               只安装 Codex 桌宠
  --uninstall-pet             卸载 AI 打工小票 Codex 桌宠
  --install-companion         同时安装 Skill 和 Codex 桌宠
  --setup                     选择自动保存或仅手动模式
  --enable-auto               启用自动保存今日小票
  --disable-auto              切换为仅手动模式
  --auto-status               查看自动保存状态
  --no-open                   生成后不自动打开浏览器
  --help                      显示帮助
`);
}

export function parseArgs(argv) {
  const result = {
    mode: "latest",
    modeExplicit: false,
    sessionId: null,
    hours: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
    locale: "zh-CN",
    theme: "classic",
    output: null,
    dataDir: null,
    installSkill: false,
    installPet: false,
    uninstallPet: false,
    installCompanion: false,
    setup: false,
    enableAuto: false,
    disableAuto: false,
    autoStatus: false,
    open: true,
  };

  const optionsWithValues = new Map([
    ["--timezone", "timezone"],
    ["--lang", "locale"],
    ["--theme", "theme"],
    ["--output", "output"],
    ["--data-dir", "dataDir"],
    ["--session", "sessionId"],
    ["--hours", "hours"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--latest") {
      result.mode = "latest";
      result.modeExplicit = true;
    } else if (argument === "--today") {
      result.mode = "today";
      result.modeExplicit = true;
    } else if (argument === "--install-pet") result.installPet = true;
    else if (argument === "--uninstall-pet") result.uninstallPet = true;
    else if (argument === "--install-companion") result.installCompanion = true;
    else if (argument === "--range") {
      const value = argv[++index];
      if (!value) throw new Error("--range 需要提供值");
      const scope = normalizeScope(value);
      if (!scope || scope === "session") throw new Error(`不支持的统计范围：${value}`);
      result.mode = scope;
      result.modeExplicit = true;
    } else if (argument === "--install-skill") result.installSkill = true;
    else if (argument === "--setup") result.setup = true;
    else if (argument === "--enable-auto") result.enableAuto = true;
    else if (argument === "--disable-auto") result.disableAuto = true;
    else if (argument === "--auto-status") result.autoStatus = true;
    else if (argument === "--no-open") result.open = false;
    else if (argument === "--help" || argument === "-h") result.help = true;
    else if (optionsWithValues.has(argument)) {
      const value = argv[++index];
      if (!value) throw new Error(`${argument} 需要提供值`);
      const key = optionsWithValues.get(argument);
      result[key] = value;
      if (key === "sessionId") {
        result.mode = "session";
        result.modeExplicit = true;
      } else if (key === "hours") {
        result.mode = "last-hours";
        result.modeExplicit = true;
      }
    } else throw new Error(`不认识的参数：${argument}`);
  }

  if (!new Set(["classic", "diner", "payroll"]).has(result.theme)) {
    throw new Error(`不支持的主题：${result.theme}`);
  }
  if (!new Set(["zh-CN", "en"]).has(result.locale)) {
    throw new Error(`不支持的语言：${result.locale}`);
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: result.timezone }).format(new Date());
  } catch {
    throw new Error(`不支持的时区：${result.timezone}`);
  }
  if (result.hours !== null) {
    result.hours = Number(result.hours);
    if (!Number.isInteger(result.hours) || result.hours < 1 || result.hours > 168) {
      throw new Error("--hours 需要 1 至 168 之间的整数");
    }
  }
  if (result.mode === "last-hours" && result.hours === null) result.hours = 3;
  const managementActions = [
    result.setup,
    result.enableAuto,
    result.disableAuto,
    result.autoStatus,
  ].filter(Boolean).length;
  if (managementActions > 1) throw new Error("自动保存管理参数不能同时使用");
  if (managementActions && result.modeExplicit) throw new Error("自动保存管理参数不能与统计范围参数同时使用");
  if (managementActions && (
    result.installSkill || result.installPet || result.uninstallPet || result.installCompanion
  )) throw new Error("自动保存管理参数不能与 Skill 或桌宠管理参数同时使用");
  return result;
}
