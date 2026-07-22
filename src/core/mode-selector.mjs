import { createInterface } from "node:readline/promises";

export async function promptForGenerationMode({ locale = "zh-CN" } = {}) {
  const isEnglish = locale === "en";
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(isEnglish ? "\nHow should AI Work Receipt save receipts?\n" : "\n你希望怎样保存 AI 打工小票？\n");
    console.log(isEnglish
      ? "1. Automatic saving (recommended)"
      : "1. 自动保存（推荐）");
    console.log(isEnglish
      ? "   Quietly refresh today's receipt and WeChat import file whenever a Codex turn stops."
      : "   Codex 每完成一轮工作，就静默刷新今天的小票和微信导入文件。");
    console.log(isEnglish
      ? "2. Manual only"
      : "2. 仅手动");
    console.log(isEnglish
      ? "   Generate only when you run the command or ask Ticket Buddy."
      : "   只有执行命令或告诉票仔时才生成。");

    while (true) {
      const answer = (await readline.question(
        isEnglish ? "\nEnter 1–2 (default 1): " : "\n请输入 1–2（默认 1）：",
      )).trim();
      if (!answer || answer === "1") return "automatic";
      if (answer === "2") return "manual";
    }
  } finally {
    readline.close();
  }
}
