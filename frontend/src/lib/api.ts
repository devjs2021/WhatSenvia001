const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "/api";

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      return null;
    }

    const data = await response.json();
    const newToken = data.data.token;
    const newRefreshToken = data.data.refreshToken;
    localStorage.setItem("token", newToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    return newToken;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    return null;
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && typeof window !== "undefined" && !endpoint.includes("/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const retryData = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, retryData.error || "Something went wrong");
      }
      return retryData;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    window.location.href = "/auth/login";
    throw new ApiError(401, "Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
    throw new ApiError(response.status, data.error || "Something went wrong");
  }

  return data;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: "POST", body }),
  put: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: "PUT", body }),
  patch: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: "PATCH", body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

/** Descarga un archivo autenticado (respuesta binaria, no JSON) y dispara el guardado en el navegador. */
export async function downloadFile(endpoint: string, filename: string): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = "No se pudo descargar el archivo";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    throw new ApiError(response.status, message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Sube un archivo (FormData) autenticado. No fija Content-Type a mano: el navegador arma el boundary multipart solo. */
export async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Something went wrong");
  }

  return data;
}

export { ApiError };
