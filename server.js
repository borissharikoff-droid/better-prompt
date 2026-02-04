const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.DEEPSEEK_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname)));

app.post("/api/improve", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "Prompt required" });
  }

  const system =
    "Ты — эксперт по улучшению промптов. Преобразуй пользовательский запрос в чёткий, структурированный промпт. " +
    "Сохраняй язык исходного запроса. Не добавляй объяснений и комментариев. Выводи только готовый промпт без Markdown.";

  const user = `Исходный запрос:\n${prompt}`;

  try {
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

    const data = await response.json();
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data?.error?.message || "DeepSeek error" });
    }

    const output = data?.choices?.[0]?.message?.content?.trim() || "";
    return res.json({ output });
  } catch (error) {
    return res.status(500).json({ error: "Request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Better Prompt server running on ${PORT}`);
});
