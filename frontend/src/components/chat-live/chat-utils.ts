export function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function getContactMediaPrefix(mediaType?: string): string {
  if (!mediaType) return "";
  const icons: Record<string, string> = { image: "📷 ", video: "🎥 ", audio: "🎵 ", document: "📄 " };
  return icons[mediaType] || "";
}

export function getContactDisplayName(contact: { name?: string; pushName?: string; contactName?: string; phone: string }): string {
  return contact.contactName || contact.name || contact.pushName || contact.phone;
}
