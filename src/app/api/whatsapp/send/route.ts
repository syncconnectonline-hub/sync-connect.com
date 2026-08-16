import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, text, token, phoneNumberId } = body;

    if (!phone || !text) {
      return NextResponse.json(
        { error: "Número de teléfono y mensaje son requeridos." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/[^\d+]/g, "");

    // If official Meta WhatsApp Cloud API credentials are provided
    if (token && phoneNumberId) {
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
          to: cleanPhone.replace("+", ""),
          type: "text",
          text: { preview_url: true, body: text },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error?.message || "Error al enviar mensaje vía WhatsApp Cloud API"
        );
      }

      return NextResponse.json({
        success: true,
        waData: data,
        phone: cleanPhone,
      });
    }

    // Default response for web WhatsApp integration
    const waLink = `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(text)}`;

    return NextResponse.json({
      success: true,
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
