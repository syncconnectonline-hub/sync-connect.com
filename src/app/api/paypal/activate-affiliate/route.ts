import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';

// Read config from env
const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'Abv8KNoqUorR_SreKjR0W86A7r7f5NcoB5K280-GgLwVv9Rovp_jWpUozT1f7H-j3Z3u86A_7v9Ro';
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'EBv8KNoqUorR_SreKjR0W86A7r7f5NcoB5K280-GgLwVv9Rovp_jWpUozT1f7H-j3Z3u86A_7v9Ro_secret';
const mode = process.env.PAYPAL_MODE || 'sandbox';

const paypalBaseUrl = mode === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Fetch PayPal Access Token
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to get PayPal access token: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, affiliateId, affiliateData } = await req.json();

    if (!orderId || !affiliateId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos de orden o identificación de socio.' }, { status: 400 });
    }

    if (!adminDb) {
      console.error('Firebase Admin SDK is not initialized.');
      return NextResponse.json({ error: 'Error del servidor de base de datos.' }, { status: 500 });
    }

    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    const isTestMode = !envClientId || envClientId.startsWith('Abv8KNo') || envClientId === 'test';

    let captureId: string;
    let payerEmail = affiliateData?.email || '';

    if (isTestMode) {
      console.log('PayPal activate-affiliate running in Test/Demo Mode.');
      captureId = orderId.startsWith('MOCK_') ? `MOCK_ACT_${Date.now()}` : orderId;
    } else {
      const accessToken = await getPayPalAccessToken();

      const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!captureResponse.ok) {
        const errText = await captureResponse.text();
        console.error('PayPal Affiliate Capture Failed:', errText);
        return NextResponse.json({ error: 'No se pudo liquidar el pago de activación en PayPal.' }, { status: 500 });
      }

      const captureData = await captureResponse.json();
      const purchaseUnit = captureData.purchase_units?.[0];
      const capture = purchaseUnit?.payments?.captures?.[0];

      if (captureData.status !== 'COMPLETED' || !capture || capture.status !== 'COMPLETED') {
        return NextResponse.json({ 
          error: 'El pago no se ha completado satisfactoriamente en PayPal.', 
          paypalStatus: captureData.status 
        }, { status: 400 });
      }

      captureId = capture.id;
      payerEmail = captureData.payer?.email_address || affiliateData?.email || '';
    }

    const activationFee = 15;

    // Save/Update Affiliate profile in Firestore as ACTIVE
    const affRef = adminDb.collection('affiliates').doc(affiliateId);
    const existingDoc = await affRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};

    const updatedProfile = {
      ...existingData,
      id: affiliateId,
      firstName: affiliateData?.firstName?.trim() || existingData?.firstName || 'Socio',
      lastName: affiliateData?.lastName?.trim() || existingData?.lastName || 'Afiliado',
      cedula: affiliateData?.cedula?.trim() || existingData?.cedula || '',
      email: (affiliateData?.email || existingData?.email || payerEmail).toLowerCase().trim(),
      whatsappNumber: affiliateData?.whatsappNumber || existingData?.whatsappNumber || '',
      bankId: affiliateData?.bankId || existingData?.bankId || 'Banco LAFISE BANCENTRO',
      bankAccountNumber: affiliateData?.bankAccountNumber || existingData?.bankAccountNumber || '',
      bankAccountHolderName: affiliateData?.bankAccountHolderName || existingData?.bankAccountHolderName || '',
      referredBy: affiliateData?.referredBy || existingData?.referredBy || null,
      registeredAt: existingData?.registeredAt || new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      status: 'Active', // AUTOMATICALLY ACTIVATED
      isPaid: true,
      paymentMethod: 'PayPal',
      activationTransactionId: captureId,
      currentBalance: existingData?.currentBalance || 0
    };

    await affRef.set(updatedProfile, { merge: true });

    // Save record in /sales or /activation_payments
    const saleId = `ACT_${captureId}`;
    const saleRecord = {
      id: saleId,
      productId: 'affiliate_activation',
      productName: 'Activación de Cuenta de Socio Afiliado',
      buyerId: affiliateId,
      buyerName: `${updatedProfile.firstName} ${updatedProfile.lastName}`.trim(),
      buyerEmail: updatedProfile.email,
      buyerPhone: updatedProfile.whatsappNumber || '',
      saleDate: new Date().toISOString(),
      saleAmount: activationFee,
      commissionEarned: 0,
      status: 'Completed',
      paymentMethod: 'PayPal',
      voucherReference: orderId,
      transactionId: captureId,
      affiliateId: updatedProfile.referredBy || 'admin'
    };

    await adminDb.collection('sales').doc(saleId).set(saleRecord);

    // Referral bonus / notification
    if (updatedProfile.referredBy) {
      try {
        const refBonusRef = adminDb.collection('affiliates').doc(updatedProfile.referredBy);
        const refDoc = await refBonusRef.get();
        if (refDoc.exists) {
          const currentBal = refDoc.data()?.currentBalance || 0;
          await refBonusRef.update({ currentBalance: currentBal + 1 });
        }

        await adminDb.collection('notifications').doc(`${updatedProfile.referredBy}_referral_${affiliateId}`).set({
          userId: updatedProfile.referredBy,
          title: '🎁 Bonificación por Referido Activado',
          message: `El usuario ${updatedProfile.firstName} ${updatedProfile.lastName} ha activado su membresía oficial por PayPal.`,
          type: 'sale',
          createdAt: new Date().toISOString(),
          isRead: false
        });
      } catch (refErr) {
        console.error('Error crediting referral bonus:', refErr);
      }
    }

    // Send Activation Email to the affiliate
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; text-align: left; color: #1e293b;">
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-bottom: 15px;">¡Felicidades, ${updatedProfile.firstName}! Tu cuenta está ACTIVA</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            Tu pago de activación de <strong>$${activationFee.toFixed(2)} USD</strong> ha sido procesado de forma automática y exitosa a través de PayPal.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #64748b; text-transform: uppercase;">Detalles de la Activación</p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Estado:</strong> <span style="color: #16a34a; font-weight: bold;">Activo / Verificado</span></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Método de Pago:</strong> PayPal Instantáneo</p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>ID de Transacción:</strong> ${captureId}</p>
            <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Monto:</strong> $${activationFee.toFixed(2)} USD</p>
          </div>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            Ya tienes acceso completo al panel de control, tu enlace personalizado de afiliado, el copiloto de IA de ventas y el catálogo de productos comerciales.
          </p>
        </div>
      `;

      await sendEmail({
        to: updatedProfile.email,
        subject: '🚀 ¡Cuenta de Socio Activada con Éxito!',
        text: `Tu cuenta de socio ha sido activada automáticamente tras el pago por PayPal. ID: ${captureId}`,
        html: emailContent,
        title: 'Cuenta Activada'
      });
    } catch (emailErr) {
      console.error('Error sending affiliate activation email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      status: 'Active',
      transactionId: captureId,
      message: 'Cuenta activada de forma automática con éxito.'
    });

  } catch (error: any) {
    console.error('Error in activate-affiliate endpoint:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
