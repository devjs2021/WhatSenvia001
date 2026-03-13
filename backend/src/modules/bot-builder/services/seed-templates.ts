import { db } from "../../../config/database.js";
import { botFlows } from "../../../infrastructure/database/schema/bot-flows.js";
import { eq } from "drizzle-orm";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

const templates = [
  {
    name: "Bienvenida Simple",
    description: "Saludo de bienvenida con botones de opciones principales",
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 400, y: 50 },
        data: { triggerType: "contains_keyword", value: "hola" },
      },
      {
        id: "message-1",
        type: "message",
        position: { x: 350, y: 200 },
        data: { message: "Hola 👋 Bienvenido/a a nuestra empresa.\n\nEstamos aqui para ayudarte." },
      },
      {
        id: "buttons-1",
        type: "buttons",
        position: { x: 350, y: 420 },
        data: {
          message: "En que puedo ayudarte hoy?",
          buttons: [
            { emoji: "🛍️", text: "Ver productos" },
            { emoji: "📞", text: "Contactar asesor" },
            { emoji: "🕐", text: "Horarios" },
          ],
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "message-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e2-3", source: "message-1", target: "buttons-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
    ],
  },
  {
    name: "Captura de Datos",
    description: "Recolecta nombre, email y consulta del cliente paso a paso",
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 400, y: 50 },
        data: { triggerType: "contains_keyword", value: "info" },
      },
      {
        id: "ask-1",
        type: "ask",
        position: { x: 350, y: 200 },
        data: { question: "Para ayudarte mejor, cual es tu nombre?", variableName: "nombre" },
      },
      {
        id: "ask-2",
        type: "ask",
        position: { x: 350, y: 400 },
        data: { question: "Gracias {{nombre}}! Cual es tu correo electronico?", variableName: "email" },
      },
      {
        id: "message-1",
        type: "message",
        position: { x: 350, y: 600 },
        data: { message: "Perfecto {{nombre}}! Un asesor se pondra en contacto contigo a {{email}}. Gracias!" },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "ask-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e2-3", source: "ask-1", target: "ask-2", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e3-4", source: "ask-2", target: "message-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
    ],
  },
  {
    name: "Soporte con IA",
    description: "Usa IA para responder preguntas frecuentes con opcion de transferir a agente",
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 400, y: 50 },
        data: { triggerType: "any_message" },
      },
      {
        id: "ai-1",
        type: "aiResponse",
        position: { x: 350, y: 200 },
        data: { context: "Eres un asistente de soporte tecnico amable. Responde preguntas sobre nuestros productos y servicios." },
      },
      {
        id: "buttons-1",
        type: "buttons",
        position: { x: 350, y: 450 },
        data: {
          message: "Te fue util mi respuesta?",
          buttons: [
            { emoji: "✅", text: "Si, gracias" },
            { emoji: "👤", text: "Hablar con agente" },
          ],
        },
      },
      {
        id: "transfer-1",
        type: "transferAgent",
        position: { x: 550, y: 650 },
        data: { agentName: "Soporte", message: "Te transfiero con un agente humano. Un momento por favor..." },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "ai-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e2-3", source: "ai-1", target: "buttons-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e3-4", source: "buttons-1", sourceHandle: "btn-1", target: "transfer-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
    ],
  },
  {
    name: "Menu de Opciones",
    description: "Menu principal con condiciones para redirigir segun la seleccion",
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 400, y: 50 },
        data: { triggerType: "first_message" },
      },
      {
        id: "message-1",
        type: "message",
        position: { x: 350, y: 180 },
        data: { message: "Bienvenido! 🎉\n\nEscribe el numero de la opcion:\n1️⃣ Productos\n2️⃣ Precios\n3️⃣ Soporte\n4️⃣ Ubicacion" },
      },
      {
        id: "ask-1",
        type: "ask",
        position: { x: 350, y: 400 },
        data: { question: "Selecciona una opcion (1-4):", variableName: "opcion" },
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 350, y: 600 },
        data: { variable: "opcion", operator: "equals", value: "1" },
      },
      {
        id: "message-2",
        type: "message",
        position: { x: 150, y: 800 },
        data: { message: "Nuestros productos:\n📱 Producto A - $50\n💻 Producto B - $100\n🎧 Producto C - $30" },
      },
      {
        id: "message-3",
        type: "message",
        position: { x: 550, y: 800 },
        data: { message: "Para esa opcion, escribe 'soporte' para hablar con un asesor." },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "message-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e2-3", source: "message-1", target: "ask-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e3-4", source: "ask-1", target: "condition-1", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e4-5", source: "condition-1", sourceHandle: "yes", target: "message-2", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
      { id: "e4-6", source: "condition-1", sourceHandle: "no", target: "message-3", animated: true, style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" } },
    ],
  },
];

export async function seedTemplates() {
  // Check if templates already exist
  const existing = await db
    .select()
    .from(botFlows)
    .where(eq(botFlows.isTemplate, true));

  if (existing.length > 0) return;

  for (const tmpl of templates) {
    await db.insert(botFlows).values({
      userId: DEV_USER_ID,
      name: tmpl.name,
      description: tmpl.description,
      status: "active",
      isTemplate: true,
      nodes: tmpl.nodes,
      edges: tmpl.edges,
    });
  }

  console.log(`Seeded ${templates.length} bot flow templates`);
}
