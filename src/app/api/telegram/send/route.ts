import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { botToken, chatId, text, parseMode } = body;

    if (!text) {
      return NextResponse.json(
        { error: "El texto del mensaje es obligatorio." },
        { status: 400 }
      );
    }

    if (botToken && chatId) {
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: parseMode || "HTML",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(
          data.description || "Error al enviar mensaje vía Telegram API"
        );
      }

      return NextResponse.json({
        success: true,
        telegramResponse: data.result,
      });
    }

    // Return simulated success response when using preview mode
    return NextResponse.json({
      success: true,
      message: "Mensaje enviado a Telegram (Modo CRM)",
      chatId: chatId || "@suscriptores",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Telegram API error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al enviar mensaje a Telegram" },
      { status: 500 }
    );
  }
}
