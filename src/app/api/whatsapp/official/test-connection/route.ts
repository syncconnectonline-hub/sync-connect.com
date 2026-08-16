import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, phoneNumberId } = body;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: "Access Token y Phone Number ID son requeridos para la prueba." },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error?.message || "Credenciales de WhatsApp Meta API no válidas." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        verifiedName: data.verified_name || "Número Verificado",
        displayPhoneNumber: data.display_phone_number || phoneNumberId,
        qualityRating: data.quality_rating || "GREEN",
      },
      message: `¡Conexión exitosa con Meta WhatsApp Cloud API (${data.display_phone_number || phoneNumberId})!`,
    });
  } catch (error: any) {
    console.error("Error testing WhatsApp API credentials:", error);
    return NextResponse.json(
      { error: error?.message || "Error al verificar credenciales de WhatsApp Meta API." },
      { status: 500 }
    );
  }
}
