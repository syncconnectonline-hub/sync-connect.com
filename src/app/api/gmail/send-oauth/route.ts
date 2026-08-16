import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, accessToken } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Destinatario, asunto y cuerpo del mensaje son requeridos." },
        { status: 400 }
      );
    }

    let oauthSent = false;
    let messageId = "";

    // 1. Try Google Gmail REST API if client provided an Access Token
    if (accessToken) {
      try {
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
        const messageParts = [
          `To: ${to}`,
          `Subject: ${utf8Subject}`,
          "Content-Type: text/html; charset=utf-8",
          "MIME-Version: 1.0",
          "",
          html,
        ];
        const rawMessage = Buffer.from(messageParts.join("\n"))
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const gmailRes = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw: rawMessage }),
          }
        );

        const gmailData = await gmailRes.json();

        if (gmailRes.ok && gmailData.id) {
          oauthSent = true;
          messageId = gmailData.id;
        } else {
          console.warn(
            "Gmail API OAuth token response:",
            gmailData?.error?.message || "Non-OK response, falling back to SMTP"
          );
        }
      } catch (oauthErr) {
        console.warn("Direct Gmail OAuth attempt failed, using fallback:", oauthErr);
      }
    }

    // 2. If OAuth succeeded, return response
    if (oauthSent) {
      return NextResponse.json({
        success: true,
        messageId,
        method: "Gmail OAuth API",
        message: `Correo enviado exitosamente vía Gmail API a ${to}`,
      });
    }

    // 3. Fallback: Deliver immediately via configured SMTP/Gmail service
    const mailRes = await sendEmail({
      to,
      subject,
      text: html.replace(/<[^>]*>?/gm, ""),
      html,
      title: subject,
    });

    if (!mailRes.success) {
      return NextResponse.json(
        { error: mailRes.error || "No se pudo completar el envío del correo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: `gmail_relayed_${Date.now()}`,
      method: "Gmail Relay / Servidor SMTP",
      message: `Correo enviado exitosamente a ${to}`,
    });
  } catch (error: any) {
    console.error("Gmail OAuth send route exception:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar envío de Gmail" },
      { status: 500 }
    );
  }
}

