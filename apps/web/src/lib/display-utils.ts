export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export interface NextPrayer {
  key: string;
  label: string;
  secondsUntil: number;
}

export function getNextPrayer(
  prayers: Array<{ key: string; label: string; adhan: string }>,
  now: Date,
  tomorrow: { fajr: string } | null
): NextPrayer | null {
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  for (const prayer of prayers) {
    const [h, m] = prayer.adhan.split(":").map(Number);
    const prayerSeconds = h * 3600 + m * 60;
    if (prayerSeconds > nowSeconds) {
      return { key: prayer.key, label: prayer.label, secondsUntil: prayerSeconds - nowSeconds };
    }
  }

  if (tomorrow) {
    const [h, m] = tomorrow.fajr.split(":").map(Number);
    const fajrSeconds = h * 3600 + m * 60;
    const secondsUntilMidnight = 86400 - nowSeconds;
    return { key: "fajr", label: "Fajr", secondsUntil: secondsUntilMidnight + fajrSeconds };
  }

  return null;
}
