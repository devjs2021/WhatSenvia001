"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";

// Custom node props - data is Record<string, any> with onUpdate callback
interface BotNodeProps {
  id: string;
  data: Record<string, any>;
}

// Base node wrapper with consistent styling
function NodeShell({
  children,
  color,
  icon,
  label,
  hasSource = true,
  hasTarget = true,
}: {
  children: React.ReactNode;
  color: string;
  icon: string;
  label: string;
  hasSource?: boolean;
  hasTarget?: boolean;
}) {
  return (
    <div className={`min-w-[240px] max-w-[300px] rounded-lg border-2 shadow-sm bg-white ${color}`}>
      {hasTarget && (
        <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white" />
      )}
      <div className="px-3 py-2 border-b flex items-center gap-2 text-sm font-medium">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="p-3">{children}</div>
      {hasSource && (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white" />
      )}
    </div>
  );
}

// === TRIGGER NODE ===
export const TriggerNode = memo(({ data, id }: BotNodeProps) => {
  const triggerType = data.triggerType as string || "contains_keyword";
  const value = data.value as string || "";

  return (
    <NodeShell color="border-amber-400 bg-amber-50" icon="🎯" label="Trigger" hasTarget={false}>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-amber-700 uppercase">Cuando</label>
        <select
          className="w-full rounded border px-2 py-1.5 text-sm bg-white"
          value={triggerType}
          onChange={(e) => data.onUpdate?.(id, { triggerType: e.target.value })}
        >
          <option value="contains_keyword">Contiene keyword</option>
          <option value="exact_match">Coincidencia exacta</option>
          <option value="starts_with">Empieza con</option>
          <option value="any_message">Cualquier mensaje</option>
          <option value="first_message">Primer mensaje</option>
        </select>
        {triggerType !== "any_message" && triggerType !== "first_message" && (
          <>
            <label className="text-xs font-semibold text-amber-700 uppercase">Valor</label>
            <Input
              placeholder="ej: hola"
              value={value}
              onChange={(e) => data.onUpdate?.(id, { value: e.target.value })}
              className="text-sm h-8"
            />
          </>
        )}
      </div>
    </NodeShell>
  );
});
TriggerNode.displayName = "TriggerNode";

// === MESSAGE NODE ===
export const MessageNode = memo(({ data, id }: BotNodeProps) => {
  const message = data.message as string || "";

  return (
    <NodeShell color="border-emerald-400 bg-emerald-50" icon="💬" label="Enviar Mensaje">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-emerald-700 uppercase">Mensaje</label>
        <Textarea
          placeholder="Escribe el mensaje..."
          value={message}
          onChange={(e) => data.onUpdate?.(id, { message: e.target.value })}
          className="text-sm resize-none min-h-[60px]"
          rows={3}
        />
        <p className="text-[10px] text-muted-foreground">Usa {"{{variable}}"} para datos dinamicos</p>
      </div>
    </NodeShell>
  );
});
MessageNode.displayName = "MessageNode";

// === MEDIA NODE ===
export const MediaNode = memo(({ data, id }: BotNodeProps) => {
  const mediaType = data.mediaType as string || "image";
  const url = data.url as string || "";
  const caption = data.caption as string || "";

  return (
    <NodeShell color="border-purple-400 bg-purple-50" icon="🖼️" label="Media">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-purple-700 uppercase">Tipo</label>
        <select
          className="w-full rounded border px-2 py-1.5 text-sm bg-white"
          value={mediaType}
          onChange={(e) => data.onUpdate?.(id, { mediaType: e.target.value })}
        >
          <option value="image">Imagen</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="document">Documento</option>
        </select>
        <Input
          placeholder="URL del archivo"
          value={url}
          onChange={(e) => data.onUpdate?.(id, { url: e.target.value })}
          className="text-sm h-8"
        />
        <Input
          placeholder="Caption (opcional)"
          value={caption}
          onChange={(e) => data.onUpdate?.(id, { caption: e.target.value })}
          className="text-sm h-8"
        />
      </div>
    </NodeShell>
  );
});
MediaNode.displayName = "MediaNode";

// === BUTTONS NODE ===
export const ButtonsNode = memo(({ data, id }: BotNodeProps) => {
  const message = data.message as string || "";
  const buttons = (data.buttons as { text: string; emoji: string }[]) || [
    { text: "", emoji: "" },
  ];

  const updateButton = (index: number, field: string, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    data.onUpdate?.(id, { buttons: newButtons });
  };

  const addButton = () => {
    if (buttons.length < 3) {
      data.onUpdate?.(id, { buttons: [...buttons, { text: "", emoji: "" }] });
    }
  };

  const removeButton = (index: number) => {
    if (buttons.length > 1) {
      data.onUpdate?.(id, { buttons: buttons.filter((_: any, i: number) => i !== index) });
    }
  };

  return (
    <NodeShell color="border-emerald-400 bg-emerald-50" icon="🔘" label="Botones">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-emerald-700 uppercase">Mensaje</label>
        <Textarea
          placeholder="Mensaje antes de los botones"
          value={message}
          onChange={(e) => data.onUpdate?.(id, { message: e.target.value })}
          className="text-sm resize-none"
          rows={2}
        />
        <label className="text-xs font-semibold text-emerald-700 uppercase">Botones (max 3)</label>
        {buttons.map((btn: { text: string; emoji: string }, i: number) => (
          <div key={i} className="flex gap-1 items-center">
            <Input
              placeholder="Emoji"
              value={btn.emoji}
              onChange={(e) => updateButton(i, "emoji", e.target.value)}
              className="text-sm h-7 w-12 text-center px-1"
            />
            <Input
              placeholder={`Boton ${i + 1}`}
              value={btn.text}
              onChange={(e) => updateButton(i, "text", e.target.value)}
              className="text-sm h-7 flex-1"
            />
            <button
              onClick={() => removeButton(i)}
              className="text-red-400 hover:text-red-600 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
            <Handle
              type="source"
              position={Position.Bottom}
              id={`btn-${i}`}
              className="!bg-emerald-400 !w-2.5 !h-2.5 !border-2 !border-white"
              style={{ left: `${((i + 1) / (buttons.length + 1)) * 100}%` }}
            />
          </div>
        ))}
        {buttons.length < 3 && (
          <button onClick={addButton} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" /> Agregar boton
          </button>
        )}
      </div>
    </NodeShell>
  );
});
ButtonsNode.displayName = "ButtonsNode";

// === ASK QUESTION NODE ===
export const AskNode = memo(({ data, id }: BotNodeProps) => {
  const question = data.question as string || "";
  const variableName = data.variableName as string || "";

  return (
    <NodeShell color="border-rose-400 bg-rose-50" icon="❓" label="Preguntar">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-rose-700 uppercase">Pregunta</label>
        <Textarea
          placeholder="Escribe la pregunta..."
          value={question}
          onChange={(e) => data.onUpdate?.(id, { question: e.target.value })}
          className="text-sm resize-none"
          rows={2}
        />
        <label className="text-xs font-semibold text-rose-700 uppercase">Guardar en variable</label>
        <Input
          placeholder="nombre_variable"
          value={variableName}
          onChange={(e) => data.onUpdate?.(id, { variableName: e.target.value })}
          className="text-sm h-8"
        />
      </div>
    </NodeShell>
  );
});
AskNode.displayName = "AskNode";

// === CONDITION NODE ===
export const ConditionNode = memo(({ data, id }: BotNodeProps) => {
  const variable = data.variable as string || "";
  const operator = data.operator as string || "equals";
  const value = data.value as string || "";

  return (
    <NodeShell color="border-blue-400 bg-blue-50" icon="🔀" label="Condicion">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-blue-700 uppercase">Variable</label>
        <Input
          placeholder="nombre_variable"
          value={variable}
          onChange={(e) => data.onUpdate?.(id, { variable: e.target.value })}
          className="text-sm h-8"
        />
        <select
          className="w-full rounded border px-2 py-1.5 text-sm bg-white"
          value={operator}
          onChange={(e) => data.onUpdate?.(id, { operator: e.target.value })}
        >
          <option value="equals">Es igual a</option>
          <option value="not_equals">No es igual a</option>
          <option value="contains">Contiene</option>
          <option value="starts_with">Empieza con</option>
          <option value="greater_than">Mayor que</option>
          <option value="less_than">Menor que</option>
        </select>
        <Input
          placeholder="Valor"
          value={value}
          onChange={(e) => data.onUpdate?.(id, { value: e.target.value })}
          className="text-sm h-8"
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-1">
        <span>Si</span>
        <span>No</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white"
        style={{ left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!bg-red-500 !w-2.5 !h-2.5 !border-2 !border-white"
        style={{ left: "70%" }}
      />
    </NodeShell>
  );
});
ConditionNode.displayName = "ConditionNode";

// === DELAY NODE ===
export const DelayNode = memo(({ data, id }: BotNodeProps) => {
  const seconds = data.seconds as number || 3;

  return (
    <NodeShell color="border-gray-400 bg-gray-50" icon="⏱️" label="Delay">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700 uppercase">Esperar (segundos)</label>
        <Input
          type="number"
          min={1}
          max={300}
          value={seconds}
          onChange={(e) => data.onUpdate?.(id, { seconds: parseInt(e.target.value) || 1 })}
          className="text-sm h-8"
        />
      </div>
    </NodeShell>
  );
});
DelayNode.displayName = "DelayNode";

// === VARIABLE NODE ===
export const VariableNode = memo(({ data, id }: BotNodeProps) => {
  const variableName = data.variableName as string || "";
  const value = data.value as string || "";

  return (
    <NodeShell color="border-indigo-400 bg-indigo-50" icon="📋" label="Variable">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-indigo-700 uppercase">Nombre</label>
        <Input
          placeholder="mi_variable"
          value={variableName}
          onChange={(e) => data.onUpdate?.(id, { variableName: e.target.value })}
          className="text-sm h-8"
        />
        <label className="text-xs font-semibold text-indigo-700 uppercase">Valor</label>
        <Input
          placeholder="valor o {{expresion}}"
          value={value}
          onChange={(e) => data.onUpdate?.(id, { value: e.target.value })}
          className="text-sm h-8"
        />
      </div>
    </NodeShell>
  );
});
VariableNode.displayName = "VariableNode";

// === SHEETS NODE ===
export const SheetsNode = memo(({ data, id }: BotNodeProps) => {
  const sheetUrl = data.sheetUrl as string || "";
  const action = data.action as string || "read";

  return (
    <NodeShell color="border-green-500 bg-green-50" icon="📊" label="Sheets">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-green-700 uppercase">Accion</label>
        <select
          className="w-full rounded border px-2 py-1.5 text-sm bg-white"
          value={action}
          onChange={(e) => data.onUpdate?.(id, { action: e.target.value })}
        >
          <option value="read">Leer datos</option>
          <option value="write">Escribir datos</option>
          <option value="search">Buscar fila</option>
        </select>
        <label className="text-xs font-semibold text-green-700 uppercase">URL Google Sheet</label>
        <Input
          placeholder="https://docs.google.com/spreadsheets/..."
          value={sheetUrl}
          onChange={(e) => data.onUpdate?.(id, { sheetUrl: e.target.value })}
          className="text-sm h-8"
        />
      </div>
    </NodeShell>
  );
});
SheetsNode.displayName = "SheetsNode";

// === GO TO FLOW NODE ===
export const GoToFlowNode = memo(({ data, id }: BotNodeProps) => {
  const targetFlowId = data.targetFlowId as string || "";

  return (
    <NodeShell color="border-cyan-400 bg-cyan-50" icon="🔗" label="Ir a Flujo" hasSource={false}>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-cyan-700 uppercase">Flujo destino</label>
        <Input
          placeholder="ID del flujo"
          value={targetFlowId}
          onChange={(e) => data.onUpdate?.(id, { targetFlowId: e.target.value })}
          className="text-sm h-8"
        />
      </div>
    </NodeShell>
  );
});
GoToFlowNode.displayName = "GoToFlowNode";

// === AI RESPONSE NODE ===
export const AIResponseNode = memo(({ data, id }: BotNodeProps) => {
  const context = data.context as string || "";

  return (
    <NodeShell color="border-violet-400 bg-violet-50" icon="🤖" label="Respuesta IA">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-violet-700 uppercase">Contexto adicional</label>
        <Textarea
          placeholder="Instrucciones o contexto para la IA..."
          value={context}
          onChange={(e) => data.onUpdate?.(id, { context: e.target.value })}
          className="text-sm resize-none"
          rows={3}
        />
      </div>
    </NodeShell>
  );
});
AIResponseNode.displayName = "AIResponseNode";

// === TRANSFER AGENT NODE ===
export const TransferAgentNode = memo(({ data, id }: BotNodeProps) => {
  const agentName = data.agentName as string || "";
  const message = data.message as string || "";

  return (
    <NodeShell color="border-orange-400 bg-orange-50" icon="👤" label="Transferir Agente" hasSource={false}>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-orange-700 uppercase">Nombre del agente</label>
        <Input
          placeholder="Nombre o departamento"
          value={agentName}
          onChange={(e) => data.onUpdate?.(id, { agentName: e.target.value })}
          className="text-sm h-8"
        />
        <label className="text-xs font-semibold text-orange-700 uppercase">Mensaje de transferencia</label>
        <Input
          placeholder="Te transfiero con un agente..."
          value={message}
          onChange={(e) => data.onUpdate?.(id, { message: e.target.value })}
          className="text-sm h-8"
        />
      </div>
    </NodeShell>
  );
});
TransferAgentNode.displayName = "TransferAgentNode";

// Export all node types for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  media: MediaNode,
  buttons: ButtonsNode,
  ask: AskNode,
  condition: ConditionNode,
  delay: DelayNode,
  variable: VariableNode,
  sheets: SheetsNode,
  goToFlow: GoToFlowNode,
  aiResponse: AIResponseNode,
  transferAgent: TransferAgentNode,
};

// Node palette items (for the sidebar)
export const nodePalette = [
  { type: "trigger", label: "Trigger", icon: "🎯", color: "border-amber-300 bg-amber-50 hover:bg-amber-100" },
  { type: "message", label: "Mensaje", icon: "💬", color: "border-emerald-300 bg-emerald-50 hover:bg-emerald-100" },
  { type: "media", label: "Media", icon: "🖼️", color: "border-purple-300 bg-purple-50 hover:bg-purple-100" },
  { type: "buttons", label: "Botones", icon: "🔘", color: "border-emerald-300 bg-emerald-50 hover:bg-emerald-100" },
  { type: "ask", label: "Preguntar", icon: "❓", color: "border-rose-300 bg-rose-50 hover:bg-rose-100" },
  { type: "condition", label: "Condicion", icon: "🔀", color: "border-blue-300 bg-blue-50 hover:bg-blue-100" },
  { type: "delay", label: "Delay", icon: "⏱️", color: "border-gray-300 bg-gray-50 hover:bg-gray-100" },
  { type: "variable", label: "Variable", icon: "📋", color: "border-indigo-300 bg-indigo-50 hover:bg-indigo-100" },
  { type: "sheets", label: "Sheets", icon: "📊", color: "border-green-300 bg-green-50 hover:bg-green-100" },
  { type: "goToFlow", label: "Ir a Flujo", icon: "🔗", color: "border-cyan-300 bg-cyan-50 hover:bg-cyan-100" },
  { type: "aiResponse", label: "Respuesta IA", icon: "🤖", color: "border-violet-300 bg-violet-50 hover:bg-violet-100" },
  { type: "transferAgent", label: "Transferir Agente", icon: "👤", color: "border-orange-300 bg-orange-50 hover:bg-orange-100" },
];
