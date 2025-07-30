function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function match(message: string, variants: string[]): boolean {
  const norm = normalize(message);
  return variants.some((v) => norm.includes(normalize(v)));
}

function getFallbackReply(message: string): { reply: string; type: string } {
  if (match(message, ["ceník", "cena", "kolik", "stojí", "cenik", "za kolik"])) {
    return {
      reply: "Ceník najdete na https://cleanstay.cz/cenik. Pro nabídku na míru nám prosím napište e-mail nebo telefon. Můžeme vám nabídku připravit na jednorázový, nebo pravidelný úklid?",
      type: "cenový dotaz",
    };
  }
  if (match(message, ["airbnb", "pronajem", "hoste", "sprava", "klice", "ubytovani"])) {
    return {
      reply: "Provádíme kompletní úklid i správu Airbnb – výměna prádla, komunikace s hosty i předání klíčů. Napište nám kontakt a vše zařídíme. Kolik apartmánů spravujete, nebo plánujete spravovat?",
      type: "airbnb",
    };
  }
  if (match(message, ["generální", "hloubkovy", "vetsi uklid", "generalni"])) {
    return {
      reply: "Generální úklid provádíme dle rozsahu. Stačí nám poslat kontakt a připravíme nabídku. O jaký typ prostoru se jedná – byt, dům nebo kancelář?",
      type: "generální úklid",
    };
  }
  if (match(message, ["rekonstrukce", "prach", "stavebni"])) {
    return {
      reply: "Úklid po rekonstrukci včetně jemného prachu, podlah, nábytku – napište nám kontakt a pošleme nabídku. Už je rekonstrukce dokončená, nebo teprve plánujete termín úklidu?",
      type: "po rekonstrukci",
    };
  }
  if (match(message, ["domácnost", "bydleni", "byt", "dum", "domacnost", "jednorazovy", "pravidelny"])) {
    return {
      reply: "Úklid domácností nabízíme jednorázově i pravidelně. Od 290 Kč/hod. Zanechte kontakt a ozveme se vám. Máte zájem o úklid jednou, nebo pravidelně (např. týdně)?",
      type: "domácnost",
    };
  }
  if (match(message, ["firma", "firemni", "kancelar", "kancelare"])) {
    return {
      reply: "Úklid kanceláří a firem provádíme pravidelně i víkendově. Napište nám, co potřebujete, a připojte kontakt. Kolik kanceláří nebo jaký prostor potřebujete uklízet?",
      type: "kancelář/firma",
    };
  }
  if (match(message, ["svj", "chodba", "vchod", "panelak", "spolecne prostory"])) {
    return {
      reply: "Úklid společných prostor pro SVJ zajišťujeme pravidelně – schody, výtahy, vstupy. Rádi pošleme nabídku, napište kontakt. O jaký typ domu se jedná – panelový, činžovní?",
      type: "SVJ",
    };
  }
  if (match(message, ["pradlo", "zahleleni", "prani", "zehleni", "pracka"])) {
    return {
      reply: "Praní nabízíme za 60 Kč/kg. Žehlení dle dohody. Můžeme se ozvat – stačí e-mail nebo telefon. Jaký objem prádla potřebujete obvykle vyprat?",
      type: "praní/žehlení",
    };
  }
  if (match(message, ["zajem", "objednat", "nabidku", "kontaktujte", "zavolejte", "poputavka", "chci"])) {
    return {
      reply: "Děkujeme za zájem. Pošlete nám prosím e-mail nebo telefon a my se vám co nejdříve ozveme. O jaký typ úklidu byste měli zájem?",
      type: "poptávka",
    };
  }
  return {
    reply: "Rádi vám pomůžeme – napište nám, s čím potřebujete poradit, nebo zanechte kontakt a ozveme se vám. Můžeme vám něco doporučit?",
    type: "ostatní",
  };
}

// === aktualizovaný POST handler s fallbackem ===

import { NextResponse } from "next/server";

const SHEET_WEBHOOK = "https://script.google.com/macros/s/AKfycbzXBKjaPEmmSf0AEFAyug3XxCuBp0ciPh-i5GGigZxMWRPbxn_xI8nx1dSstd7al9Rc/exec";

export async function POST(req: Request) {
  const { message, sessionId } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  let reply = "Omlouvám se, momentálně nejsme dostupní. Zkuste to prosím později.";
  let logReply = reply;
  let type = "chyba";

  try {
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
            content: `
Jsi přátelský chatbot firmy CleanStay v Praze. Nabízíte:

- Úklid domácností: od 290 Kč/hod.
- Úklid firem a kanceláří
- Generální úklid
- Úklid po rekonstrukci
- Úklid Airbnb: včetně výměny prádla (60 Kč/kg)
- Praní, žehlení, ekologické prostředky

Pokud klient projeví zájem o službu nebo objednávku, jemně mu navrhni:
„Rádi vám pošleme nezávaznou nabídku – napište nám prosím svůj e-mail nebo telefon.“

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
      type = "odpověď GPT";
    } else {
      const fallback = getFallbackReply(message);
      reply = fallback.reply;
      logReply = `Fallback: ${fallback.reply}`;
      type = fallback.type;
    }
  } catch (error) {
    const fallback = getFallbackReply(message);
    reply = fallback.reply;
    logReply = `Fallback error: ${fallback.reply} (chyba: ${error})`;
    type = fallback.type;
  }

    console.log("📤 Odesílám do Google Sheets:", {
  question: message,
  answer: logReply,
  page: req.headers.get("referer") || "",
  ip: req.headers.get("x-forwarded-for") || "",
  session: sessionId || "",
  type: type,
});

  await fetch(SHEET_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 CleanStayBot",
    },
    body: JSON.stringify({
      question: message,
      answer: logReply,
      page: req.headers.get("referer") || "",
      ip: req.headers.get("x-forwarded-for") || "",
      session: sessionId || "",
      type: type,
    }),
  }).catch((err) => console.error("Log error do Google Sheets:", err));

  return new NextResponse(JSON.stringify({ reply }), {
    status: 200,
    headers: {
  "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
},
  });
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}