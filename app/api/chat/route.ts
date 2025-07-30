import { NextResponse } from "next/server";

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    }
  );
}

export async function POST(req: Request) {
  const { message } = await req.json();

  const apiKey = process.env.OPENAI_API_KEY;

  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Jsi přátelský chatbot firmy CleanStay, který pomáhá lidem s informacemi o úklidu, cenách a službách v Praze. Odpovídej mile, přirozeně a výstižně.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  const data = await gptRes.json();

  // 👉 TADY: výpis celé odpovědi z OpenAI
  console.log("GPT response:", JSON.stringify(data, null, 2));

  if (!data.choices) {
    console.error("OpenAI error:", data);
  }

  const reply = data.choices?.[0]?.message?.content || "Omlouvám se, něco se pokazilo.";

  return new NextResponse(JSON.stringify({ reply }), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}
