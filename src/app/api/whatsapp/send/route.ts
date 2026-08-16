import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { phone, text, token, phoneNumberId } = body;

    if (!phone || !text) {
      return NextResponse.json(
        { error: "Número de teléfono y mensaje son requeridos." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/[^\d]/g, "");
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    // Try to auto-resolve official Meta tokens from Firestore if not provided in payload
    if ((!token || !phoneNumberId) && adminDb) {
      try {
        const snap = await adminDb.collection("site_config").doc("whatsapp-official").get();
        if (snap.exists) {
          const cfg = snap.data();
          if (cfg?.accessToken) token = cfg.accessToken;
          if (cfg?.phoneNumberId) phoneNumberId = cfg.phoneNumberId;
        }
      } catch (dbErr) {
        console.warn("Could not load WhatsApp config from Firestore:", dbErr);
      }
    }

    // If official Meta WhatsApp Cloud API credentials are provided
    if (token && phoneNumberId) {
      try {
        const waUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        const res = await fetch(waUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: { preview_url: true, body: text },
          }),
        });

        const data = await res.json();

        if (res.ok) {
          return NextResponse.json({
            success: true,
            sentViaApi: true,
            waData: data,
            phone: cleanPhone,
            waLink: waLink,
          });
        } else {
          console.warn("WhatsApp Cloud API response:", data?.error?.message);
        }
      } catch (cloudErr) {
        console.warn("WhatsApp Cloud API call error, falling back to Web link:", cloudErr);
      }
    }

    // Response with WhatsApp web / direct chat link
    return NextResponse.json({
      success: true,
      sentViaApi: false,
      message: "Mensaje listo para envío por WhatsApp CRM",
      phone: cleanPhone,
      waLink: waLink,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("WhatsApp API error:", error);
    return NextResponse.json(
      { error: error?.message || "Error procesando envío por WhatsApp" },
      { status: 500 }
    );
  }
}
