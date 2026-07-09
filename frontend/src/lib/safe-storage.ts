/**
 * localStorage puede lanzar una excepción al acceder (Safari en modo privado,
 * almacenamiento bloqueado por política del navegador, cuota agotada). Como
 * esto se lee en la inicialización de los stores de zustand (auth, i18n),
 * antes ese error tumbaba toda la app antes de que React llegara a renderizar
 * nada — ningún error boundary lo puede atrapar por ocurrir fuera del árbol.
 */
export function getStoredItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStoredItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // No-op: si el navegador bloquea el storage, seguimos sin persistir sesión/idioma.
  }
}

export function removeStoredItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // No-op
  }
}
