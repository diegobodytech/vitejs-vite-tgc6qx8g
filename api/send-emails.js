const SUPABASE_URL = "https://dcxjqhiimcldtlfzhaka.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjeGpxaGlpbWNsZHRsZnpoYWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzAwNjcsImV4cCI6MjA5NzcwNjA2N30.tQKRm8mNBbCbnPgbXhB2Ju5HnGR-CB8XQOov4m82W4k";
const RESEND_KEY = "re_L6fQdwKd_7Epo8Eh7ZDsLX1WNuBGf7MsP";

export default async function handler(req, res) {
  try {
    // Leer correos pendientes
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cola_correos?estado=eq.Pendiente`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const correos = await r.json();

    for (const correo of correos) {
      // Extraer email destinatario del campo etapa
      const partes = correo.etapa.split(" - ");
      const email = partes[partes.length - 1];
      const etapa = partes[0];

      if (!email || !email.includes("@")) continue;

      // Construir asunto y cuerpo según etapa
      let asunto = "";
      let cuerpo = "";

      if (etapa.startsWith("Nuevo Lead")) {
        asunto = `🆕 Nuevo lead registrado – ${correo.razon_social}`;
        cuerpo = `Hola,\n\nSe ha registrado un nuevo prospecto en el pipeline comercial.\n\nNIT: ${correo.nit}\nEmpresa: ${correo.razon_social}\n\nPor favor revisar el CRM:\nhttps://crmbodyempresas.vercel.app`;
      } else if (etapa === "Cotización") {
        asunto = `📋 Nueva cotización pendiente – ${correo.razon_social}`;
        cuerpo = `Hola,\n\nHay un nuevo convenio pendiente de cotización y autorización de oferta.\n\nNIT: ${correo.nit}\nEmpresa: ${correo.razon_social}\n\nPor favor revisar el CRM:\nhttps://crmbodyempresas.vercel.app`;
      } else if (etapa === "Implementación") {
        asunto = `⚖️ Nuevo convenio para implementación – ${correo.razon_social}`;
        cuerpo = `Hola,\n\nHay un nuevo convenio listo para implementación y perfeccionamiento contractual.\n\nNIT: ${correo.nit}\nEmpresa: ${correo.razon_social}\n\nPor favor revisar el CRM:\nhttps://crmbodyempresas.vercel.app`;
      } else if (etapa === "Lanzamiento") {
        asunto = `🚀 Nuevo convenio para lanzamiento – ${correo.razon_social}`;
        cuerpo = `Hola,\n\nHay un nuevo convenio listo para lanzamiento comercial.\n\nNIT: ${correo.nit}\nEmpresa: ${correo.razon_social}\n\nPor favor revisar el CRM:\nhttps://crmbodyempresas.vercel.app`;
      }

      if (!asunto) continue;

      // Enviar correo via Resend
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "CRM Comercial <onboarding@resend.dev>",
          to: [email],
          subject: asunto,
          text: cuerpo
        })
      });

      // Marcar como enviado
      await fetch(`${SUPABASE_URL}/rest/v1/cola_correos?id=eq.${correo.id}`, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({ estado: "Enviado", fecha_envio: new Date().toISOString() })
      });
    }

    res.status(200).json({ ok: true, procesados: correos.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
