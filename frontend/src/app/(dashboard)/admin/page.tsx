"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Users,
  Shield,
  Plus,
  Trash2,
  Edit,
  Key,
  Ban,
  CheckCircle,
  Crown,
  Clock,
  BarChart3,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  license?: {
    id: string;
    plan: string;
    status: string;
    expiresAt?: string | null;
    maxSessions: number;
    maxContacts: number;
    maxMessagesPerDay: number;
  } | null;
}

interface AdminStats {
  totalUsers: number;
  activeLicenses: number;
  roleStats: Record<string, number>;
  planStats: Record<string, number>;
}

const PLANS = ["demo", "basic", "pro", "enterprise"];

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateLicense, setShowCreateLicense] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);

  // Create user form
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", company: "", role: "user" });
  // Create license form
  const [newLicense, setNewLicense] = useState({ plan: "basic", durationDays: 30 });
  // Reset password
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!isAdmin()) {
      router.replace("/dashboard");
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get<{ success: boolean; data: AdminUser[] }>("/admin/users"),
        api.get<{ success: boolean; data: AdminStats }>("/admin/stats"),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    try {
      await api.post("/admin/users", newUser);
      toast.success("Usuario creado");
      setShowCreateUser(false);
      setNewUser({ email: "", password: "", name: "", company: "", role: "user" });
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleToggleActive(userId: string, currentActive: boolean) {
    try {
      await api.put(`/admin/users/${userId}`, { isActive: !currentActive });
      toast.success(currentActive ? "Usuario desactivado" : "Usuario activado");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Eliminar este usuario y todos sus datos?")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success("Usuario eliminado");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleCreateLicense(userId: string) {
    try {
      await api.post("/admin/licenses/plan", {
        userId,
        plan: newLicense.plan,
        durationDays: newLicense.durationDays,
      });
      toast.success(`Licencia ${newLicense.plan} creada`);
      setShowCreateLicense(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleResetPassword(userId: string) {
    if (!newPassword || newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    try {
      await api.post(`/admin/users/${userId}/reset-password`, { password: newPassword });
      toast.success("Contraseña actualizada");
      setEditingPassword(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleSuspendLicense(licenseId: string) {
    try {
      await api.post(`/admin/licenses/${licenseId}/suspend`);
      toast.success("Licencia suspendida");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleReactivateLicense(licenseId: string) {
    try {
      await api.post(`/admin/licenses/${licenseId}/reactivate`);
      toast.success("Licencia reactivada");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6" />
          Panel de Administracion
        </h1>
        <button
          onClick={() => setShowCreateUser(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Crear Usuario
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Total Usuarios
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Shield className="h-4 w-4" />
              Licencias Activas
            </div>
            <p className="text-2xl font-bold mt-1">{stats.activeLicenses}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Crown className="h-4 w-4" />
              Admins
            </div>
            <p className="text-2xl font-bold mt-1">{stats.roleStats?.admin || 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />
              Planes Activos
            </div>
            <div className="flex gap-2 mt-1">
              {Object.entries(stats.planStats || {}).map(([plan, count]) => (
                <span key={plan} className="text-xs bg-muted px-2 py-1 rounded">
                  {plan}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Crear Nuevo Usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            />
            <input
              type="password"
              placeholder="Contraseña (min 8 chars)"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            />
            <input
              type="text"
              placeholder="Empresa (opcional)"
              value={newUser.company}
              onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateUser}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Crear
            </button>
            <button
              onClick={() => setShowCreateUser(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Usuario</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium">Licencia</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Registro</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      {user.company && <p className="text-xs text-muted-foreground">{user.company}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {user.role === "admin" ? <Crown className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.license ? (
                      <div>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            user.license.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {user.license.plan} ({user.license.status})
                        </span>
                        {user.license.expiresAt && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(user.license.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin licencia</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setShowCreateLicense(showCreateLicense === user.id ? null : user.id)}
                        className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Asignar licencia"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingPassword(editingPassword === user.id ? null : user.id)}
                        className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Cambiar contraseña"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
                        title={user.isActive ? "Desactivar" : "Activar"}
                      >
                        {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      {user.license && user.license.status === "active" && (
                        <button
                          onClick={() => handleSuspendLicense(user.license!.id)}
                          className="rounded p-1.5 hover:bg-accent text-orange-500"
                          title="Suspender licencia"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      {user.license && user.license.status === "suspended" && (
                        <button
                          onClick={() => handleReactivateLicense(user.license!.id)}
                          className="rounded p-1.5 hover:bg-accent text-green-500"
                          title="Reactivar licencia"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="rounded p-1.5 hover:bg-accent text-destructive"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* License creation inline */}
                    {showCreateLicense === user.id && (
                      <div className="mt-2 p-3 rounded border bg-muted/50 space-y-2">
                        <select
                          value={newLicense.plan}
                          onChange={(e) => setNewLicense({ ...newLicense, plan: e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-xs bg-background"
                        >
                          {PLANS.map((p) => (
                            <option key={p} value={p}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={newLicense.durationDays}
                          onChange={(e) => setNewLicense({ ...newLicense, durationDays: Number(e.target.value) })}
                          className="w-full rounded border px-2 py-1.5 text-xs bg-background"
                          placeholder="Dias de duracion"
                          min={1}
                        />
                        <button
                          onClick={() => handleCreateLicense(user.id)}
                          className="w-full rounded bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground"
                        >
                          Asignar Licencia
                        </button>
                      </div>
                    )}

                    {/* Password reset inline */}
                    {editingPassword === user.id && (
                      <div className="mt-2 p-3 rounded border bg-muted/50 space-y-2">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded border px-2 py-1.5 text-xs bg-background"
                          placeholder="Nueva contraseña (min 8)"
                        />
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="w-full rounded bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground"
                        >
                          Cambiar Contraseña
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
