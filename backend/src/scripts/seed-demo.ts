/**
 * Seed demo data for video recording.
 * Run: npx tsx src/scripts/seed-demo.ts
 */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { config } from "dotenv";
config();

import { users } from "../infrastructure/database/schema/users.js";
import { contacts } from "../infrastructure/database/schema/contacts.js";
import { campaigns } from "../infrastructure/database/schema/campaigns.js";
import { messages } from "../infrastructure/database/schema/messages.js";
import { chatMessages } from "../infrastructure/database/schema/chat.js";
import { whatsappSessions } from "../infrastructure/database/schema/whatsapp-sessions.js";
import { notifications } from "../infrastructure/database/schema/notifications.js";
import { metaTemplates } from "../infrastructure/database/schema/meta-templates.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Demo contacts
const demoContacts = [
  { phone: "573001234567", name: "Carlos Méndez", email: "carlos@empresa.co", tags: ["cliente", "premium"] },
  { phone: "573009876543", name: "María García", email: "maria@tienda.co", tags: ["cliente", "nuevo"] },
  { phone: "573005551234", name: "Andrés López", email: "andres@startup.io", tags: ["lead", "interesado"] },
  { phone: "573008884321", name: "Laura Rodríguez", email: "laura@marketing.co", tags: ["cliente", "premium"] },
  { phone: "573002223344", name: "Juan Pérez", email: "juan@comercio.co", tags: ["lead"] },
  { phone: "573007776655", name: "Sofía Martínez", email: "sofia@digital.co", tags: ["cliente", "vip"] },
  { phone: "573004443322", name: "Diego Herrera", email: "diego@corp.co", tags: ["cliente"] },
  { phone: "573006665544", name: "Valentina Torres", email: "val@shop.co", tags: ["lead", "interesado"] },
  { phone: "573003332211", name: "Santiago Ruiz", email: "santi@tech.co", tags: ["cliente", "premium"] },
  { phone: "573001119988", name: "Camila Vargas", email: "camila@negocios.co", tags: ["cliente"] },
  { phone: "573008887766", name: "Felipe Castro", email: "felipe@ventas.co", tags: ["lead"] },
  { phone: "573005554433", name: "Isabella Moreno", email: "isabella@moda.co", tags: ["cliente", "vip"] },
];

// Chat conversations
const chatConversations: { phone: string; pushName: string; messages: { content: string; direction: "incoming" | "outgoing"; minutesAgo: number }[] }[] = [
  {
    phone: "573001234567",
    pushName: "Carlos Méndez",
    messages: [
      { content: "Hola, me interesa saber más sobre sus planes de envío masivo", direction: "incoming", minutesAgo: 45 },
      { content: "¡Hola Carlos! Claro, tenemos planes desde $69/mes con envíos ilimitados y soporte prioritario", direction: "outgoing", minutesAgo: 43 },
      { content: "¿Incluye conexión con la API de Meta?", direction: "incoming", minutesAgo: 40 },
      { content: "Sí, todos nuestros planes incluyen integración directa con Meta Cloud API, verificación oficial y sin riesgo de baneo", direction: "outgoing", minutesAgo: 38 },
      { content: "Excelente, me gustaría activar el plan Pro", direction: "incoming", minutesAgo: 35 },
      { content: "¡Perfecto! Te envío el link de activación. Tendrás 7 días gratis para probar todas las funciones", direction: "outgoing", minutesAgo: 33 },
      { content: "Gracias, ya lo activé. ¿Cómo conecto mi número?", direction: "incoming", minutesAgo: 10 },
      { content: "Ve a la sección 'Conexión' en el menú lateral y sigue los pasos. Si necesitas ayuda, aquí estoy 💪", direction: "outgoing", minutesAgo: 8 },
    ],
  },
  {
    phone: "573009876543",
    pushName: "María García",
    messages: [
      { content: "Buenos días, necesito enviar una promoción a 2,000 clientes", direction: "incoming", minutesAgo: 120 },
      { content: "¡Buenos días María! Con ClickSend puedes hacerlo fácilmente. ¿Ya tienes tu lista de contactos?", direction: "outgoing", minutesAgo: 118 },
      { content: "Sí, tengo un Excel con todos los números", direction: "incoming", minutesAgo: 115 },
      { content: "Perfecto. Ve a Contactos > Importar y sube tu archivo. El sistema valida los números automáticamente", direction: "outgoing", minutesAgo: 113 },
      { content: "Listo, ya importé 2,150 contactos. ¿Ahora cómo creo la campaña?", direction: "incoming", minutesAgo: 60 },
      { content: "Ve a Envío Masivo, selecciona tu plantilla aprobada por Meta, elige los contactos y programa el envío. Nuestro sistema controla los límites automáticamente para proteger tu cuenta", direction: "outgoing", minutesAgo: 58 },
      { content: "¡Increíble! Ya quedó programada para las 10am 🎉", direction: "incoming", minutesAgo: 30 },
    ],
  },
  {
    phone: "573005551234",
    pushName: "Andrés López",
    messages: [
      { content: "Buenas tardes, ¿ClickSend funciona con WhatsApp Business API?", direction: "incoming", minutesAgo: 180 },
      { content: "¡Hola Andrés! Sí, usamos la API oficial de Meta Cloud. Esto garantiza entregas seguras y tu cuenta verificada con el check azul", direction: "outgoing", minutesAgo: 178 },
      { content: "¿Cuántos mensajes puedo enviar por día?", direction: "incoming", minutesAgo: 175 },
      { content: "Depende del tier de tu cuenta Meta. Empiezas con 1,000/día y con nuestro sistema de calentamiento automático puedes llegar hasta 100,000/día", direction: "outgoing", minutesAgo: 173 },
      { content: "Me interesa para mi startup, tenemos 5,000 usuarios", direction: "incoming", minutesAgo: 170 },
      { content: "El plan Pro es ideal para ti. Incluye envío masivo, bot builder, chat en vivo y control de campañas", direction: "outgoing", minutesAgo: 168 },
    ],
  },
  {
    phone: "573008884321",
    pushName: "Laura Rodríguez",
    messages: [
      { content: "Hola, la campaña de Black Friday fue un éxito total 🔥", direction: "incoming", minutesAgo: 15 },
      { content: "¡Qué buena noticia Laura! ¿Cuántas conversiones tuviste?", direction: "outgoing", minutesAgo: 13 },
      { content: "342 ventas directas desde WhatsApp. Un ROI del 850%", direction: "incoming", minutesAgo: 10 },
      { content: "¡Increíble! Esos son números excelentes. ¿Quieres que programemos la de Navidad?", direction: "outgoing", minutesAgo: 8 },
      { content: "Sí por favor, quiero enviar a toda mi base de 8,000 clientes", direction: "incoming", minutesAgo: 5 },
    ],
  },
  {
    phone: "573007776655",
    pushName: "Sofía Martínez",
    messages: [
      { content: "El chatbot está respondiendo perfecto, mis clientes están encantados", direction: "incoming", minutesAgo: 90 },
      { content: "¡Me alegra mucho Sofía! El bot builder de ClickSend es muy potente. ¿Necesitas agregar algún flujo nuevo?", direction: "outgoing", minutesAgo: 88 },
      { content: "Sí, quiero agregar uno de seguimiento post-venta", direction: "incoming", minutesAgo: 85 },
      { content: "Puedes crearlo en Bot Builder. Usa el trigger 'después de compra' y agrega los pasos de seguimiento con tiempos de espera", direction: "outgoing", minutesAgo: 83 },
      { content: "Perfecto, lo voy a configurar ahora", direction: "incoming", minutesAgo: 80 },
    ],
  },
  {
    phone: "573002223344",
    pushName: "Juan Pérez",
    messages: [
      { content: "Hola, ¿tienen algún descuento para agencias?", direction: "incoming", minutesAgo: 3 },
    ],
  },
];

// Demo campaigns
const demoCampaigns = [
  {
    name: "Black Friday 2026 — Ofertas Exclusivas",
    message: "🔥 ¡Black Friday en {{nombre}}! Hasta 70% de descuento. Solo por 48 horas. Compra aquí: {{link}}",
    status: "completed" as const,
    totalContacts: 3500,
    sentCount: 3420,
    deliveredCount: 3380,
    failedCount: 80,
    daysAgo: 3,
  },
  {
    name: "Lanzamiento Colección Verano",
    message: "☀️ Hola {{nombre}}, nuestra nueva colección de verano ya está disponible. ¡Descubre las tendencias!",
    status: "completed" as const,
    totalContacts: 2150,
    sentCount: 2130,
    deliveredCount: 2100,
    failedCount: 20,
    daysAgo: 7,
  },
  {
    name: "Recordatorio Pago Mensual",
    message: "Hola {{nombre}}, te recordamos que tu pago vence el {{fecha}}. Evita recargos pagando a tiempo.",
    status: "completed" as const,
    totalContacts: 1200,
    sentCount: 1195,
    deliveredCount: 1180,
    failedCount: 5,
    daysAgo: 1,
  },
  {
    name: "Encuesta Satisfacción — Mayo",
    message: "Hola {{nombre}}, tu opinión nos importa. ¿Podrías responder nuestra encuesta de 2 minutos? {{link}}",
    status: "completed" as const,
    totalContacts: 5000,
    sentCount: 4920,
    deliveredCount: 4850,
    failedCount: 80,
    daysAgo: 14,
  },
  {
    name: "Promo Navidad — Early Bird",
    message: "🎄 ¡Anticípate a la Navidad! 30% de descuento en toda la tienda. Usa el código NAVIDAD30",
    status: "scheduled" as const,
    totalContacts: 8000,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    daysAgo: 0,
  },
  {
    name: "Bienvenida Nuevos Suscriptores",
    message: "¡Hola {{nombre}}! Bienvenido/a a nuestra comunidad. Aquí tu cupón de 15% para tu primera compra: BIENVENIDO15",
    status: "completed" as const,
    totalContacts: 450,
    sentCount: 448,
    deliveredCount: 445,
    failedCount: 2,
    daysAgo: 5,
  },
];

async function seed() {
  console.log("🌱 Seeding demo data...\n");

  // Get first user
  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("❌ No user found. Create an account first.");
    process.exit(1);
  }
  console.log(`👤 Using user: ${user.name} (${user.email})`);

  // Get first connected session
  const [session] = await db
    .select()
    .from(whatsappSessions)
    .where(eq(whatsappSessions.userId, user.id))
    .limit(1);

  const sessionId = session?.id;
  if (!sessionId) {
    console.warn("⚠️  No WhatsApp session found. Chat messages will be skipped.");
  }

  // 1. Seed contacts
  console.log("\n📇 Creating contacts...");
  const contactIds: Record<string, string> = {};
  for (const c of demoContacts) {
    const existing = await db.select().from(contacts).where(eq(contacts.phone, c.phone)).limit(1);
    if (existing.length > 0) {
      contactIds[c.phone] = existing[0].id;
      console.log(`   ⏭️  ${c.name} (already exists)`);
    } else {
      const [created] = await db.insert(contacts).values({
        userId: user.id,
        phone: c.phone,
        name: c.name,
        email: c.email,
        tags: c.tags,
        stage: "new",
      }).returning();
      contactIds[c.phone] = created.id;
      console.log(`   ✅ ${c.name} — ${c.phone}`);
    }
  }

  // 2. Seed campaigns + messages
  console.log("\n📣 Creating campaigns...");
  for (const camp of demoCampaigns) {
    const startedAt = new Date(Date.now() - camp.daysAgo * 86400000);
    const completedAt = camp.status === "completed" ? new Date(startedAt.getTime() + 3600000) : null;

    const [created] = await db.insert(campaigns).values({
      userId: user.id,
      sessionId: sessionId || null,
      name: camp.name,
      message: camp.message,
      status: camp.status,
      totalContacts: camp.totalContacts,
      sentCount: camp.sentCount,
      deliveredCount: camp.deliveredCount,
      failedCount: camp.failedCount,
      startedAt,
      completedAt,
      createdAt: startedAt,
    }).returning();

    console.log(`   ✅ ${camp.name} (${camp.status}) — ${camp.sentCount}/${camp.totalContacts}`);

    // Create some message records for this campaign
    if (camp.status === "completed") {
      const contactEntries = Object.entries(contactIds).slice(0, Math.min(5, camp.totalContacts));
      for (const [phone, contactId] of contactEntries) {
        await db.insert(messages).values({
          userId: user.id,
          contactId,
          campaignId: created.id,
          phone,
          content: camp.message.replace("{{nombre}}", demoContacts.find(c => c.phone === phone)?.name || "Cliente"),
          status: "delivered",
          sentAt: new Date(startedAt.getTime() + Math.random() * 3600000),
          deliveredAt: new Date(startedAt.getTime() + Math.random() * 3600000 + 60000),
        });
      }
    }
  }

  // 3. Seed chat conversations
  if (sessionId) {
    console.log("\n💬 Creating chat conversations...");
    for (const conv of chatConversations) {
      const existingMsgs = await db.select().from(chatMessages)
        .where(eq(chatMessages.phone, conv.phone))
        .limit(1);

      if (existingMsgs.length > 0) {
        console.log(`   ⏭️  ${conv.pushName} (already has messages)`);
        continue;
      }

      for (const msg of conv.messages) {
        const createdAt = new Date(Date.now() - msg.minutesAgo * 60000);
        await db.insert(chatMessages).values({
          sessionId,
          phone: conv.phone,
          content: msg.content,
          direction: msg.direction,
          senderType: msg.direction === "incoming" ? "user" : "human",
          pushName: conv.pushName,
          status: msg.direction === "outgoing" ? "delivered" : "sent",
          createdAt,
        });
      }
      console.log(`   ✅ ${conv.pushName} — ${conv.messages.length} messages`);
    }
  }

  // 4. Seed Meta Templates (approved)
  console.log("\n📋 Creating Meta templates...");
  const wabaId = "1186945711159195";
  const demoTemplates = [
    {
      metaTemplateId: "tmpl_001",
      name: "promo_imagen",
      status: "APPROVED",
      category: "MARKETING",
      language: "es",
      components: [
        { type: "HEADER", format: "IMAGE", example: { header_handle: ["https://example.com/promo.jpg"] } },
        { type: "BODY", text: "Hola {{1}}, tenemos una promoción especial para ti. ¡No te la pierdas! Descuentos de hasta {{2}}% en toda la tienda.", example: { body_text: [["Carlos", "50"]] } },
        { type: "FOOTER", text: "Válido hasta agotar existencias" },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Ver ofertas", url: "https://tienda.com/ofertas" }, { type: "QUICK_REPLY", text: "No me interesa" }] },
      ],
    },
    {
      metaTemplateId: "tmpl_002",
      name: "bienvenida_cliente",
      status: "APPROVED",
      category: "MARKETING",
      language: "es",
      components: [
        { type: "BODY", text: "¡Hola {{1}}! 🎉 Bienvenido/a a nuestra comunidad. Como regalo de bienvenida, aquí tienes un cupón del 15% de descuento: BIENVENIDO15. ¡Úsalo en tu primera compra!", example: { body_text: [["María"]] } },
        { type: "FOOTER", text: "Cupón válido por 30 días" },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Ir a la tienda", url: "https://tienda.com" }] },
      ],
    },
    {
      metaTemplateId: "tmpl_003",
      name: "recordatorio_pago",
      status: "APPROVED",
      category: "UTILITY",
      language: "es",
      components: [
        { type: "BODY", text: "Hola {{1}}, te recordamos que tu pago de {{2}} vence el {{3}}. Evita recargos realizando tu pago a tiempo. Si ya pagaste, ignora este mensaje.", example: { body_text: [["Juan", "$150.000", "15 de junio"]] } },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Pagar ahora", url: "https://pagos.com/pagar" }] },
      ],
    },
    {
      metaTemplateId: "tmpl_004",
      name: "confirmacion_pedido",
      status: "APPROVED",
      category: "UTILITY",
      language: "es",
      components: [
        { type: "BODY", text: "¡Gracias por tu compra, {{1}}! 🛍️ Tu pedido #{{2}} ha sido confirmado. Recibirás tu paquete en {{3}} días hábiles. Te enviaremos el número de seguimiento cuando sea despachado.", example: { body_text: [["Laura", "ORD-5847", "3-5"]] } },
        { type: "FOOTER", text: "ClickSend — Envíos seguros" },
      ],
    },
    {
      metaTemplateId: "tmpl_005",
      name: "encuesta_satisfaccion",
      status: "APPROVED",
      category: "MARKETING",
      language: "es",
      components: [
        { type: "BODY", text: "Hola {{1}}, tu opinión nos importa mucho. ¿Podrías dedicar 2 minutos a responder nuestra encuesta de satisfacción? Queremos seguir mejorando para ti.", example: { body_text: [["Sofía"]] } },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Responder encuesta", url: "https://encuesta.com/satisfaccion" }, { type: "QUICK_REPLY", text: "Ahora no" }] },
      ],
    },
    {
      metaTemplateId: "tmpl_006",
      name: "oferta_flash",
      status: "APPROVED",
      category: "MARKETING",
      language: "es",
      components: [
        { type: "HEADER", format: "IMAGE", example: { header_handle: ["https://example.com/flash.jpg"] } },
        { type: "BODY", text: "⚡ ¡OFERTA FLASH! {{1}}, solo por las próximas {{2}} horas: {{3}}% de descuento en productos seleccionados. ¡Corre que se agotan!", example: { body_text: [["Diego", "24", "40"]] } },
        { type: "FOOTER", text: "Sujeto a disponibilidad" },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Comprar ahora", url: "https://tienda.com/flash" }] },
      ],
    },
    {
      metaTemplateId: "tmpl_007",
      name: "seguimiento_envio",
      status: "APPROVED",
      category: "UTILITY",
      language: "es",
      components: [
        { type: "BODY", text: "Hola {{1}}, tu pedido #{{2}} ya fue despachado 📦. Número de seguimiento: {{3}}. Puedes rastrearlo en el siguiente enlace.", example: { body_text: [["Valentina", "ORD-3921", "COL-892741"]] } },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Rastrear envío", url: "https://rastreo.com/{{1}}" }] },
      ],
    },
    {
      metaTemplateId: "tmpl_008",
      name: "reactivacion_cliente",
      status: "APPROVED",
      category: "MARKETING",
      language: "es",
      components: [
        { type: "BODY", text: "¡Hola {{1}}! Te extrañamos 😊. Hace tiempo que no nos visitas. Tenemos novedades que te van a encantar. Vuelve y recibe un {{2}}% de descuento exclusivo.", example: { body_text: [["Santiago", "20"]] } },
        { type: "FOOTER", text: "Oferta exclusiva para clientes" },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Ver novedades", url: "https://tienda.com/novedades" }, { type: "QUICK_REPLY", text: "No me interesa" }] },
      ],
    },
    {
      metaTemplateId: "tmpl_009",
      name: "cita_recordatorio",
      status: "APPROVED",
      category: "UTILITY",
      language: "es",
      components: [
        { type: "BODY", text: "Hola {{1}}, te recordamos tu cita programada para el {{2}} a las {{3}}. Si necesitas reagendar, responde a este mensaje.", example: { body_text: [["Camila", "lunes 10 de junio", "3:00 PM"]] } },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirmar" }, { type: "QUICK_REPLY", text: "Reagendar" }] },
      ],
    },
    {
      metaTemplateId: "tmpl_010",
      name: "black_friday_vip",
      status: "APPROVED",
      category: "MARKETING",
      language: "es",
      components: [
        { type: "HEADER", format: "VIDEO", example: { header_handle: ["https://example.com/bf-video.mp4"] } },
        { type: "BODY", text: "🔥 {{1}}, como cliente VIP tienes acceso anticipado al Black Friday. Hasta {{2}}% de descuento antes que nadie. ¡Solo por 48 horas!", example: { body_text: [["Isabella", "70"]] } },
        { type: "FOOTER", text: "Acceso exclusivo VIP" },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Acceder ahora", url: "https://tienda.com/vip-bf" }] },
      ],
    },
  ];

  for (const tmpl of demoTemplates) {
    const existing = await db.select().from(metaTemplates)
      .where(eq(metaTemplates.metaTemplateId, tmpl.metaTemplateId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`   ⏭️  ${tmpl.name} (already exists)`);
      continue;
    }

    await db.insert(metaTemplates).values({
      userId: user.id,
      wabaId,
      metaTemplateId: tmpl.metaTemplateId,
      name: tmpl.name,
      status: tmpl.status,
      category: tmpl.category,
      language: tmpl.language,
      components: tmpl.components,
    });
    console.log(`   ✅ ${tmpl.name} [${tmpl.category}] — ${tmpl.status}`);
  }

  // 5. Seed notifications
  console.log("\n🔔 Creating notifications...");
  const demoNotifications = [
    { type: "campaign_completed" as const, title: 'Campaña "Black Friday 2026" completada', body: "3,420 enviados, 80 fallidos de 3,500 total", minutesAgo: 180 },
    { type: "campaign_completed" as const, title: 'Campaña "Recordatorio Pago" completada', body: "1,195 enviados, 5 fallidos de 1,200 total", minutesAgo: 60 },
    { type: "new_chat" as const, title: "Nuevo mensaje de Carlos Méndez", body: "Gracias, ya lo activé. ¿Cómo conecto mi número?", minutesAgo: 10 },
    { type: "new_chat" as const, title: "Nuevo mensaje de Laura Rodríguez", body: "Sí por favor, quiero enviar a toda mi base de 8,000 clientes", minutesAgo: 5 },
    { type: "campaign_scheduled" as const, title: 'Campaña "Promo Navidad" programada', body: "8,000 contactos listos para envío", minutesAgo: 30 },
    { type: "new_chat" as const, title: "Nuevo mensaje de Juan Pérez", body: "Hola, ¿tienen algún descuento para agencias?", minutesAgo: 3 },
    { type: "campaign_completed" as const, title: 'Campaña "Encuesta Satisfacción" completada', body: "4,920 enviados, 80 fallidos de 5,000 total", minutesAgo: 1440 },
  ];

  for (const n of demoNotifications) {
    await db.insert(notifications).values({
      userId: user.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.minutesAgo > 120,
      createdAt: new Date(Date.now() - n.minutesAgo * 60000),
    });
    console.log(`   ✅ [${n.type}] ${n.title}`);
  }

  console.log("\n🎬 Demo data ready! You can now record your video.\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
