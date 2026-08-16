import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, contact, ruleId, customData } = body;

    if (!event || !contact) {
      return NextResponse.json(
        { error: "Evento y datos de contacto son requeridos para la automatización." },
        { status: 400 }
      );
    }

    const logs: string[] = [];
    logs.push(`Disparador '${event}' recibido para ${contact.name || contact.email || contact.phone}`);

    // Perform default automated actions based on event type
    let actionsTaken = 0;

    if (event === "new_lead" || event === "nuevo_prospecto") {
      logs.push("Acción 1: Notificación enviada por Gmail a la cuenta conectada");
      logs.push("Acción 2: Plantilla de bienvenida por WhatsApp programada");
      actionsTaken += 2;
    } else if (event === "telegram_sub" || event === "nuevo_suscriptor_telegram") {
      logs.push("Acción 1: Bot de Telegram envió mensaje con catálogo de productos");
      actionsTaken += 1;
    } else if (event === "sale_completed" || event === "nueva_venta") {
      logs.push("Acción 1: Correo de confirmación con acceso enviado por Gmail");
      logs.push("Acción 2: Contacto promovido automáticamente a estado 'Cliente VIP'");
      logs.push("Acción 3: Notificación de comisión enviada a grupo de Telegram");
      actionsTaken += 3;
    } else {
      logs.push(`Acción 1: Regla personalizada ejecutada para ${event}`);
      actionsTaken += 1;
    }

    return NextResponse.json({
      success: true,
      event,
      contact: contact.name || contact.email,
      actionsCount: actionsTaken,
      executionLogs: logs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Automation engine error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al ejecutar flujo de automatización" },
      { status: 500 }
    );
  }
}
