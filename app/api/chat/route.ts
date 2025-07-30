import { NextResponse } from "next/server";

const SHEET_WEBHOOK = "https://script.google.com/macros/s/AKfycbzXBKjaPEmmSf0AEFAyug3XxCuBp0ciPh-i5GGigZxMWRPbxn_xI8nx1dSstd7al9Rc/exec";

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function POST(req: Request) {
  const { message } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  let reply = "Omlouvám se, momentálně nejsme dostupní. Zkuste to prosím později.";
  let logReply = reply;

  try {
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // změň na gpt-4, pokud máš aktivní kredit
        messages: [
          {
            role: "system",
            content: `
Jsi přátelský chatbot firmy CleanStay v Praze. Nabízíte:

- Úklid domácností: od 290 Kč/hod.
- Úklid firem a kanceláří
- Generální úklid
- Úklid po rekonstrukci
- Úklid Airbnb: včetně výměny prádla (60 Kč/kg)
- Praní, žehlení, ekologické prostředky

Ceník: https://cleanstay.cz/cenik

Odpovídej mile, výstižně a nabídni konkrétní službu podle dotazu klienta.
            `,
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await gptRes.json();

    if (data.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
      logReply = reply;
    } else if (data.error?.message) {
      logReply = `Chyba: ${data.error.message}`;
    }

  } catch (error) {
    logReply = `Technická chyba: ${error}`;
  }

  // Logování do Google Sheet
  fetch(SHEET_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: message,
      answer: logReply,
      page: req.headers.get("referer") || "",
      ip: req.headers.get("x-forwarded-for") || "",
    }),
  }).catch((err) => console.error("Log error:", err));

  return new NextResponse(JSON.stringify({ reply }), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}
