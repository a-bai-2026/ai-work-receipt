export function printHelp() {
  console.log(`
Codex AI 打工小票

用法：
  npx codex-work-receipt@latest --latest
  npx codex-work-receipt@latest --today

选项：
  --latest                    统计最近活跃的 Codex 会话（默认）
  --today                     统计本地时区今天发生的全部 Codex 活动
  --timezone <name>           指定 IANA 时区，例如 Asia/Shanghai
  --theme <name>              默认主题：classic、diner、payroll
  --output <file>             指定生成的 HTML 文件，默认写入 ./codex-work-receipt-output/
  --data-dir <directory>      指定本地结构数据目录
  --miniprogram-code <file>   指定正式小程序码 PNG/JPEG/SVG
  --no-open                   生成后不自动打开浏览器
  --help                      显示帮助
`);
}

export function parseArgs(argv) {
  const result = {
    mode: "latest",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
    theme: "classic",
    output: null,
    dataDir: null,
    miniProgramCode: null,
    open: true,
  };

  const optionsWithValues = new Map([
    ["--timezone", "timezone"],
    ["--theme", "theme"],
    ["--output", "output"],
    ["--data-dir", "dataDir"],
    ["--miniprogram-code", "miniProgramCode"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--latest") result.mode = "latest";
    else if (argument === "--today") result.mode = "today";
    else if (argument === "--no-open") result.open = false;
    else if (argument === "--help" || argument === "-h") result.help = true;
    else if (optionsWithValues.has(argument)) {
      const value = argv[++index];
      if (!value) throw new Error(`${argument} 需要提供值`);
      result[optionsWithValues.get(argument)] = value;
    } else throw new Error(`不认识的参数：${argument}`);
  }

  if (!new Set(["classic", "diner", "payroll"]).has(result.theme)) {
    throw new Error(`不支持的主题：${result.theme}`);
  }
  return result;
}
