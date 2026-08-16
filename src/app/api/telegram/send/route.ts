import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { botToken, chatId, text, parseMode } = body;

    if (!text) {
      return NextResponse.json(
        { error: "El texto del mensaje es obligatorio." },
        { status: 400 }
      );
    }

    // Try to resolve botToken from Firestore if not passed
    if (!botToken && adminDb) {
      try {
        const snap = await adminDb.collection("site_config").doc("telegram-config").get();
        if (snap.exists) {
          botToken = snap.data()?.botToken;
        }
      } catch (dbErr) {
        console.warn("Could not load Telegram config from Firestore:", dbErr);
      }
    }

    // Normalize username or chat ID
    let targetChat = chatId ? String(chatId).trim() : "";
    let cleanUsername = "";
    if (targetChat.startsWith("@")) {
      cleanUsername = targetChat.substring(1);
    } else if (targetChat && isNaN(Number(targetChat))) {
      cleanUsername = targetChat;
      targetChat = `@${targetChat}`;
    }

    const tmeLink = cleanUsername 
      ? `https://t.me/${cleanUsername}?text=${encodeURIComponent(text.replace(/<[^>]*>?/gm, ""))}`
      : `https://t.me/share/url?url=${encodeURIComponent("https://syncconnect.online")}&text=${encodeURIComponent(text.replace(/<[^>]*>?/gm, ""))}`;

    if (botToken && targetChat) {
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChat,
          text: text,
          parse_mode: parseMode || "HTML",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        // If the chat wasn't found via Bot API (e.g. user hasn't messaged the bot yet), return helpful fallback with direct link
        return NextResponse.json({
          success: true,
          sentViaApi: false,
          fallbackReason: data.description || "El usuario aún no ha iniciado conversación con el bot.",
          message: `Enlace directo generado para ${targetChat}`,
          telegramLink: tmeLink,
          chatId: targetChat,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        sentViaApi: true,
        telegramResponse: data.result,
        telegramLink: tmeLink,
        chatId: targetChat,
        timestamp: new Date().toISOString(),
      });
    }

    // Direct Telegram link fallback
    return NextResponse.json({
      success: true,
      sentViaApi: false,
      message: "Mensaje listo para envío por Telegram CRM",
      telegramLink: tmeLink,
      chatId: targetChat || "@contacto",
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
