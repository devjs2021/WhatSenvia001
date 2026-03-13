"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  BackgroundVariant,
} from "@xyflow/react";
import type { Connection, Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "@/lib/api";
import type { ApiResponse, BotFlow, WhatsAppSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Save, Play, Pause, X, Bot } from "lucide-react";
import { nodeTypes, nodePalette } from "@/components/bot-builder/node-types";

type FlowNode = Node<Record<string, any>>;
type FlowEdge = Edge;

function FlowEditor() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const flowId = params.id as string;
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([] as FlowNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([] as FlowEdge[]);
  const [flowName, setFlowName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);

  // Load flow data
  const { data: flowData, isLoading } = useQuery({
    queryKey: ["bot-flow", flowId],
    queryFn: () => api.get<ApiResponse<BotFlow>>(`/bot-builder/flows/${flowId}`),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const sessions = (sessionsData?.data || []).filter((s) => s.status === "connected");

  // Node data update handler - called by custom nodes
  const handleNodeDataUpdate = useCallback(
    (nodeId: string, newData: Record<string, any>) => {
      setNodes((nds: FlowNode[]) =>
        nds.map((node: FlowNode) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, ...newData } };
          }
          return node;
        })
      );
      setHasUnsavedChanges(true);
    },
    [setNodes]
  );

  // Initialize nodes/edges from loaded data
  useEffect(() => {
    if (flowData?.data) {
      const flow = flowData.data;
      setFlowName(flow.name);

      const loadedNodes: FlowNode[] = (flow.nodes || []).map((n: any) => ({
        ...n,
        data: { ...n.data, onUpdate: handleNodeDataUpdate },
      }));
      setNodes(loadedNodes);
      setEdges((flow.edges || []) as FlowEdge[]);
    }
  }, [flowData, handleNodeDataUpdate, setNodes, setEdges]);

  // Connect edges
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: any = {
        ...connection,
        animated: true,
        style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" },
      };
      setEdges((eds: FlowEdge[]) => addEdge(newEdge, eds) as FlowEdge[]);
      setHasUnsavedChanges(true);
    },
    [setEdges]
  );

  // Drag & drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: FlowNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { onUpdate: handleNodeDataUpdate },
      };

      setNodes((nds: FlowNode[]) => [...nds, newNode]);
      setHasUnsavedChanges(true);
    },
    [reactFlowInstance, setNodes, handleNodeDataUpdate]
  );

  // Save flow
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Strip onUpdate callback before saving (not serializable)
      const cleanNodes = nodes.map((n: FlowNode) => {
        const { onUpdate, ...rest } = n.data as any;
        return { ...n, data: rest };
      });

      await api.put(`/bot-builder/flows/${flowId}`, {
        name: flowName,
        nodes: cleanNodes,
        edges,
      });
    },
    onSuccess: () => {
      toast.success("Flujo guardado");
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["bot-flow", flowId] });
      queryClient.invalidateQueries({ queryKey: ["bot-flows"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Toggle status
  const toggleMutation = useMutation({
    mutationFn: (sessionId?: string) =>
      api.post<ApiResponse<BotFlow>>(`/bot-builder/flows/${flowId}/toggle`, sessionId ? { sessionId } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-flow", flowId] });
      queryClient.invalidateQueries({ queryKey: ["bot-flows"] });
      setShowSessionPicker(false);
      toast.success("Estado actualizado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  function handleToggle() {
    if (flow?.status === "active") {
      toggleMutation.mutate(undefined);
    } else {
      if (sessions.length === 0) {
        toast.error("No hay numeros de WhatsApp conectados. Conecta uno primero.");
        return;
      }
      if (sessions.length === 1) {
        toggleMutation.mutate(sessions[0].id);
      } else {
        setShowSessionPicker(true);
      }
    }
  }

  const flow = flowData?.data;

  // Keyboard shortcut for save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveMutation.mutate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nodes, edges, flowName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Cargando flujo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/bot-builder")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <Input
            value={flowName}
            onChange={(e) => {
              setFlowName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="h-8 w-64 font-semibold border-transparent hover:border-input focus:border-input"
          />
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Sin guardar</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
          >
            {flow?.status === "active" ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Desactivar
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Activar
              </>
            )}
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {saveMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Node Palette */}
        <div className="w-48 border-r bg-background overflow-y-auto p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Arrastra los nodos
          </h3>
          <div className="space-y-1.5">
            {nodePalette.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/reactflow", item.type);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-grab active:cursor-grabbing transition-colors ${item.color}`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-medium text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              setHasUnsavedChanges(true);
            }}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes as any}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-gray-50"
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" },
            }}
          >
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              className="!bg-white !border !rounded-lg"
              maskColor="rgba(0,0,0,0.05)"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
          </ReactFlow>
        </div>
      </div>

      {/* Session Picker Modal */}
      {showSessionPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSessionPicker(false)}>
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Seleccionar numero</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSessionPicker(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Elige a que numero de WhatsApp deseas asignar este flujo:
            </p>
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => toggleMutation.mutate(session.id)}
                  className="w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{session.name}</p>
                    {session.phone && <p className="text-xs text-muted-foreground">{session.phone}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
