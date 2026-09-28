/**
 * Quiet Hours Manager (Default: 21:00 - 07:00 WAT / West Africa Time, UTC+1).
 * Prevents non-urgent night-time notifications.
 */

export interface QuietHoursCheck {
  isQuiet: boolean;
  currentHourWAT: number;
  nextAllowedWindowAt: Date;
}

export function checkQuietHours(
  currentDate?: Date,
  startHourWAT: number = 21, // 9 PM
  endHourWAT: number = 7     // 7 AM
): QuietHoursCheck {
  const now = currentDate || new Date();
  
  // Convert current time to WAT (UTC + 1)
  const utcHours = now.getUTCHours();
  const watHour = (utcHours + 1) % 24;

  let isQuiet = false;

  if (startHourWAT > endHourWAT) {
    // Night window spans midnight (e.g. 21:00 to 07:00)
    if (watHour >= startHourWAT || watHour < endHourWAT) {
      isQuiet = true;
    }
  } else {
    // Window within same day
    if (watHour >= startHourWAT && watHour < endHourWAT) {
      isQuiet = true;
    }
  }

  // Calculate next allowed window timestamp
  const nextAllowed = new Date(now.getTime());
  if (isQuiet) {
    if (watHour >= startHourWAT) {
      // Moves to next day endHourWAT
      nextAllowed.setUTCDate(nextAllowed.getUTCDate() + 1);
    }
    // Set UTC hour corresponding to endHourWAT in WAT (endHourWAT - 1 UTC)
    let targetUtcHour = endHourWAT - 1;
    if (targetUtcHour < 0) targetUtcHour += 24;
    nextAllowed.setUTCHours(targetUtcHour, 0, 0, 0);
  }

  return {
    isQuiet,
    currentHourWAT: watHour,
    nextAllowedWindowAt: nextAllowed,
  };
}
