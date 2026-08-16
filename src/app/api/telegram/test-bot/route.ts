import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { botToken } = body;

    if (!botToken) {
      return NextResponse.json(
        { error: "Por favor ingresa un Telegram Bot Token válido." },
        { status: 400 }
      );
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();

    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { error: data.description || "Token de Telegram inválido o bot no encontrado." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      bot: {
        id: data.result.id,
        username: `@${data.result.username}`,
        firstName: data.result.first_name,
        canJoinGroups: data.result.can_join_groups,
      },
      message: `¡Conexión exitosa con el bot @${data.result.username}!`,
    });
  } catch (error: any) {
    console.error("Error testing Telegram Bot Token:", error);
    return NextResponse.json(
      { error: error?.message || "Error al verificar el token de Telegram." },
      { status: 500 }
    );
  }
}
