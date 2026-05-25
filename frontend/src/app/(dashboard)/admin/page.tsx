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
  Key,
  Ban,
  CheckCircle,
  Crown,
  Clock,
  BarChart3,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

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
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardHeader
        title={
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Panel de Administracion
          </div>
        }
      >
        <button
          onClick={() => setShowCreateUser(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Crear Usuario
        </button>
      </DashboardHeader>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <DashboardCard variant="metric">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <Users className="h-4 w-4" />
                Total Usuarios
              </div>
              <p className="font-display text-2xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
            </div>
          </DashboardCard>
          <DashboardCard variant="metric">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <Shield className="h-4 w-4" />
                Licencias Activas
              </div>
              <p className="font-display text-2xl font-bold text-slate-900 mt-1">{stats.activeLicenses}</p>
            </div>
          </DashboardCard>
          <DashboardCard variant="metric">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <Crown className="h-4 w-4" />
                Admins
              </div>
              <p className="font-display text-2xl font-bold text-slate-900 mt-1">{stats.roleStats?.admin || 0}</p>
            </div>
          </DashboardCard>
          <DashboardCard variant="metric">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <BarChart3 className="h-4 w-4" />
                Planes Activos
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {Object.entries(stats.planStats || {}).map(([plan, count]) => (
                  <span key={plan} className="text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded-full">
                    {plan}: {count}
                  </span>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <DashboardCard>
          <DashboardCardHeader>
            <DashboardCardTitle>Crear Nuevo Usuario</DashboardCardTitle>
          </DashboardCardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <input
              type="password"
              placeholder="Contraseña (min 8 chars)"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <input
              type="text"
              placeholder="Empresa (opcional)"
              value={newUser.company}
              onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateUser}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
            >
              Crear
            </button>
            <button
              onClick={() => setShowCreateUser(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all"
            >
              Cancelar
            </button>
          </div>
        </DashboardCard>
      )}

      {/* Users Table */}
      <DashboardCard variant="table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Licencia</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Registro</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{user.name}</p>
                      {user.company && <p className="text-xs text-slate-400">{user.company}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-blue-50 text-blue-600"
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
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            user.license.status === "active"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {user.license.plan} ({user.license.status})
                        </span>
                        {user.license.expiresAt && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(user.license.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin licencia</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.isActive
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setShowCreateLicense(showCreateLicense === user.id ? null : user.id)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
                        title="Asignar licencia"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingPassword(editingPassword === user.id ? null : user.id)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
                        title="Cambiar contraseña"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
                        title={user.isActive ? "Desactivar" : "Activar"}
                      >
                        {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      {user.license && user.license.status === "active" && (
                        <button
                          onClick={() => handleSuspendLicense(user.license!.id)}
                          className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-amber-50 text-amber-500 transition-all"
                          title="Suspender licencia"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      {user.license && user.license.status === "suspended" && (
                        <button
                          onClick={() => handleReactivateLicense(user.license!.id)}
                          className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-emerald-50 text-emerald-500 transition-all"
                          title="Reactivar licencia"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* License creation inline */}
                    {showCreateLicense === user.id && (
                      <div className="mt-2 p-3 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
                        <select
                          value={newLicense.plan}
                          onChange={(e) => setNewLicense({ ...newLicense, plan: e.target.value })}
                          className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer w-full"
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
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full"
                          placeholder="Dias de duracion"
                          min={1}
                        />
                        <button
                          onClick={() => handleCreateLicense(user.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                        >
                          Asignar Licencia
                        </button>
                      </div>
                    )}

                    {/* Password reset inline */}
                    {editingPassword === user.id && (
                      <div className="mt-2 p-3 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full"
                          placeholder="Nueva contraseña (min 8)"
                        />
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
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
      </DashboardCard>
    </div>
  );
}
