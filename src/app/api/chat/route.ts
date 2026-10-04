import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `أنت معلم افتراضي خبير وصبور وودود. اسمك "أستاذ ذكي".
تجيب دائماً بالعربية الفصحى المبسطة المناسبة للطلاب.
تشرح المفاهيم بطريقة سهلة وممتعة مع أمثلة من الحياة اليومية.`;

function generateEducationalResponse(message: string): string {
  const msg = message.trim().toLowerCase();
  if (msg.includes("جمع") || msg.includes("+")) return "الجمع يعني وضع أرقام معاً.\nمثال: 3 + 5 = 8\nجرّب: 7 + 4 = ؟ (الجواب: 11)";
  if (msg.includes("طرح") || msg.includes("-")) return "الطرح هو أخذ كمية من كمية أخرى.\nمثال: 10 - 4 = 6\nجرّب: 15 - 8 = ؟ (الجواب: 7)";
  if (msg.includes("ضرب") || msg.includes("×")) return "الضرب هو جمع متكرر.\nمثال: 4 × 3 = 12\nجرّب: 5 × 6 = ؟ (الجواب: 30)";
  if (msg.includes("قسمة") || msg.includes("÷")) return "القسمة تعني التوزيع بالتساوي.\nمثال: 12 ÷ 3 = 4\nجرّب: 20 ÷ 5 = ؟ (الجواب: 4)";
  if (msg.includes("كسر")) return "الكسر يمثّل جزءاً من الكل.\n½ = نصف · ¾ = ثلاثة أرباع\nتخيّل بيتزا مقسمة إلى 4 أجزاء.";
  if (msg.includes("ماء") || msg.includes("h2o")) return "الماء H₂O مركب من هيدروجين وأكسجين.\nيتغير: ثلج ← ماء ← بخار.";
  if (msg.includes("كهرباء")) return "الكهرباء تدفق إلكترونات.\nالدائرة تحتاج: بطارية + أسلاك + جهاز.";
  if (msg.includes("بناء ضوئي") || msg.includes("نبات")) return "النباتات تصنع غذاءها عبر البناء الضوئي.\nضوء + ماء + CO₂ → سكر + أكسجين.";
  if (msg.includes("فعل") || msg.includes("اسم")) return "الكلمة: اسم (كتاب) · فعل (كتب) · حرف (من).";
  if (msg.includes("مرحبا") || msg.includes("السلام") || msg.includes("هلا")) return "وعليكم السلام! 👋 أنا أستاذ ذكي.\nاسألني عن أي درس وسأشرحه لك.";
  if (msg.includes("شكرا")) return "العفو! 🌟 استمر في التعلم.";
  if (msg.includes("صعب") || msg.includes("ما فهمت")) return "لا بأس! دعنا نقسمه إلى أجزاء صغيرة. أين توقفت؟";
  return `شكراً لسؤالك.\nأنا أستاذ ذكي. اسأل عن: الجمع، الطرح، البناء الضوئي، الإعراب، أو أي درس.\nماذا تريد أن تتعلم؟`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;
    if (!message) return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });

    const openaiKey = process.env.OPENAI_API_KEY;
    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

    if (xaiKey || openaiKey) {
      const apiUrl = xaiKey ? "https://api.x.ai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
      const apiKey = xaiKey || openaiKey;
      const model = xaiKey ? "grok-3" : "gpt-4o-mini";
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-8).map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: message },
      ];
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 500 }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ reply: data.choices?.[0]?.message?.content || generateEducationalResponse(message), source: "ai" });
      }
    }

    return NextResponse.json({ reply: generateEducationalResponse(message), source: "edu-engine" });
  } catch {
    return NextResponse.json({ reply: "عذراً، حدث خطأ. حاول مرة أخرى.", source: "error" });
  }
}
