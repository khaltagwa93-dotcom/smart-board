import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `أنت معلم افتراضي خبير وصبور وودود. اسمك "أستاذ ذكي".
تجيب دائماً بالعربية الفصحى المبسطة المناسبة لطلاب المدارس والجامعات.
تشرح المفاهيم بطريقة سهلة وممتعة مع أمثلة من الحياة اليومية وتشبيهات واضحة.
تستخدم خطوات مرقمة وتمارين قصيرة.
تشجع الطالب دائماً وتُظهر الحماس للتعلم.
لا تتجاوز 220 كلمة إلا إذا طُلب تفصيل أطول.
إذا سُئلت عن الرياضيات أو العلوم أو اللغة أو أي مادة، اشرح خطوة بخطوة.`;

function generateEducationalResponse(message: string): string {
  const msg = message.trim().toLowerCase();
  if (msg.includes("جمع") || msg.includes("+") || msg.includes("اضف")) return "مرحباً! الجمع يعني وضع أرقام معاً.\n\nمثال: 3 + 5 = 8\nجرّب: 7 + 4 = ؟ (11)";
  if (msg.includes("طرح") || msg.includes("-")) return "الطرح هو أخذ كمية من كمية أخرى.\nمثال: 10 - 4 = 6\nجرّب: 15 - 8 = ؟ (7)";
  if (msg.includes("ضرب") || msg.includes("×")) return "الضرب هو جمع متكرر.\nمثال: 4 × 3 = 12\nجرّب: 5 × 6 = ؟ (30)";
  if (msg.includes("قسمة") || msg.includes("÷")) return "القسمة توزيع بالتساوي.\nمثال: 12 ÷ 3 = 4";
  if (msg.includes("كسر")) return "الكسر جزء من الكل.\n½ = نصف · ¾ = ثلاثة أرباع";
  if (msg.includes("معادلة") || msg.includes("حل")) return "لحل س + 5 = 12 ← س = 7";
  if (msg.includes("ماء") || msg.includes("h2o")) return "الماء H₂O · حالات: ثلج ← ماء ← بخار";
  if (msg.includes("كهرباء")) return "الكهرباء تدفق إلكترونات. الدائرة: بطارية + أسلاك + جهاز";
  if (msg.includes("بناء ضوئي") || msg.includes("نبات")) return "البناء الضوئي: ضوء + ماء + CO₂ → سكر + أكسجين";
  if (msg.includes("فعل") || msg.includes("اسم")) return "اسم (كتاب) · فعل (كتب) · حرف (من)";
  if (msg.includes("مرحبا") || msg.includes("السلام") || msg.includes("هلا")) return "وعليكم السلام! 👋 أنا أستاذ ذكي. اسألني عن أي درس.";
  if (msg.includes("شكرا")) return "العفو! 🌟 استمر في التعلم.";
  if (msg.includes("صعب") || msg.includes("ما فهمت")) return "لا بأس! دعنا نقسمه. أين توقفت؟";
  if (msg.includes("تمارين")) return "1) 8+7=?  2) 20-9=?  3) 4×5=?";
  return `شكراً لسؤالك.\nأنا أستاذ ذكي. اسأل عن الرياضيات أو العلوم أو اللغة.`;
}

async function callGemini(message: string, history: any[]): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  try {
    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const contents = [
      ...history.slice(-6).map((h: any) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.content }] })),
      { role: "user", parts: [{ text: message }] },
    ];
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 600, topP: 0.9 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
}

async function callGroq(message: string, history: any[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-6).map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;
    if (!message || typeof message !== "string") return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });

    let reply = await callGemini(message, history);
    if (reply) return NextResponse.json({ reply, source: "gemini" });

    reply = await callGroq(message, history);
    if (reply) return NextResponse.json({ reply, source: "groq" });

    reply = generateEducationalResponse(message);
    return NextResponse.json({ reply, source: "edu-engine" });
  } catch {
    return NextResponse.json({ reply: "عذراً، حدث خطأ. حاول مرة أخرى.", source: "error" });
  }
}
