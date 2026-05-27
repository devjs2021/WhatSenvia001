export function getLicenseStatus(user: any, t: (key: string, params?: Record<string, any>) => string) {
  if (!user || user.role === "admin") return null;

  const license = user.license;
  if (!license) return { type: "none" as const, message: t('license.noLicense') };
  if (license.status === "suspended") return { type: "suspended" as const, message: t('license.suspended') };
  if (license.status === "expired") return { type: "expired" as const, message: t('license.expired') };
  if (license.status === "cancelled") return { type: "expired" as const, message: t('license.cancelled') };

  if (license.expiresAt) {
    const daysLeft = Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return { type: "expired" as const, message: t('license.expired') };
    if (daysLeft <= 3) return { type: "warning" as const, message: t('license.expiresIn', {days: daysLeft}) };
  }

  return null;
}
