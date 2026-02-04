const path = require("path");
const express = require("express");
const { Telegraf } = require("telegraf");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.DEEPSEEK_API_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_ENABLED = process.env.TELEGRAM_BOT_ENABLED !== "false";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasDeepseekKey: Boolean(API_KEY),
    hasTelegramToken: Boolean(BOT_TOKEN),
    node: process.version,
  });
});

async function callDeepSeek(prompt) {
  if (!API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not set");
  }

  const system =
    "Ты — эксперт по улучшению промптов. Преобразуй пользовательский запрос в чёткий, структурированный промпт. " +
    "Сохраняй язык исходного запроса. Не добавляй объяснений и комментариев. Выводи только готовый промпт без Markdown.";

  const user = `Исходный запрос:\n${prompt}`;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: 900,
      stream: false,
    }),
  });

  const raw = await response.text();
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch (error) {
    data = {};
  }
  if (!response.ok) {
    console.error("DeepSeek error", response.status, raw);
    throw new Error(data?.error?.message || "DeepSeek error");
  }

  return data?.choices?.[0]?.message?.content?.trim() || "";
}

app.post("/api/improve", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "Prompt required" });
  }

  try {
    const output = await callDeepSeek(prompt);
    return res.json({ output });
  } catch (error) {
    console.error("Improve error:", error.message);
    return res.status(500).json({ error: error.message || "Request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Better Prompt server running on ${PORT}`);
});

if (BOT_TOKEN && BOT_ENABLED) {
  const bot = new Telegraf(BOT_TOKEN);

  const escapeHtml = (value) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  bot.start(async (ctx) => {
    const message =
      "Better Prompt — делаем идеальный промпт за вас.\n" +
      "Отправьте текст, и я верну улучшенную версию.";
    await ctx.reply(message);
  });

  bot.on("text", async (ctx) => {
    const text = String(ctx.message.text || "").trim();
    if (!text || text.startsWith("/")) {
      return;
    }

    const statusMessages = ["обрабатываем.", "обрабатываем..", "обрабатываем..."];
    let index = 0;

    const status = await ctx.reply(statusMessages[index]);
    const interval = setInterval(() => {
      index = (index + 1) % statusMessages.length;
      ctx.telegram
        .editMessageText(ctx.chat.id, status.message_id, undefined, statusMessages[index])
        .catch(() => {});
    }, 700);

    try {
      const improved = await callDeepSeek(text);
      clearInterval(interval);
      await ctx.telegram.deleteMessage(ctx.chat.id, status.message_id).catch(() => {});
      const escaped = escapeHtml(improved || "Пустой результат.");
      await ctx.reply(`<pre>${escaped}</pre>`, { parse_mode: "HTML" });
    } catch (error) {
      clearInterval(interval);
      await ctx.telegram
        .editMessageText(ctx.chat.id, status.message_id, undefined, "ошибка обработки.")
        .catch(() => {});
      await ctx.reply("Не удалось улучшить промпт. Попробуйте ещё раз.");
    }
  });

  bot.telegram
    .deleteWebhook({ drop_pending_updates: true })
    .catch(() => {})
    .finally(() => {
      bot.launch()
        .then(() => {
          console.log("Telegram bot started");
        })
        .catch((error) => {
          console.error("Telegram bot failed to start:", error.message);
        });
    });
} else {
  console.warn("Telegram bot disabled (missing token or TELEGRAM_BOT_ENABLED=false).");
}
