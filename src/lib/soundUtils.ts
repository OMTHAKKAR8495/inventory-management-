/**
 * Web Audio API synthesizer for task notifications and buzzers.
 * No external MP3 files needed; works 100% offline with zero latency.
 */

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioCtx = new AudioCtxClass();
    }
  }
  return sharedAudioCtx;
}

/**
 * Automatically unlock AudioContext on the user's first interaction.
 * Browsers block sound until the user clicks or presses a key on the page.
 */
export function initAudioUnlock(): () => void {
  if (typeof window === "undefined") return () => {};

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    } else if (ctx && ctx.state === "running") {
      isAudioUnlocked = true;
    }
  };

  const events = ["click", "pointerdown", "keydown", "touchstart"];
  events.forEach((ev) => window.addEventListener(ev, unlock, { once: false, passive: true }));

  return () => {
    events.forEach((ev) => window.removeEventListener(ev, unlock));
  };
}

export interface BuzzerOptions {
  urgent?: boolean;
  volume?: number; // 0.1 to 1.0 (default 0.7)
}

/**
 * Play an audible task reception buzzer alert.
 * - Normal: Dual energetic chime/buzzer pulse (660Hz -> 880Hz)
 * - Urgent: Triple sharp warning buzzer pulses (880Hz -> 1046Hz -> 1320Hz)
 */
export async function playTaskBuzzerSound(options: BuzzerOptions = {}): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const { urgent = false, volume = 0.7 } = options;
    const now = ctx.currentTime;

    // Define tone sequences
    // Urgent: 3 fast piercing alert beeps (880Hz, 1046Hz, 1320Hz)
    // Normal: 2 pleasant yet crisp alert beeps (660Hz, 880Hz)
    const tones = urgent
      ? [
          { freq: 880, start: now, duration: 0.12, type: "sawtooth" as OscillatorType },
          { freq: 1046.5, start: now + 0.14, duration: 0.12, type: "sawtooth" as OscillatorType },
          { freq: 1318.5, start: now + 0.28, duration: 0.22, type: "sine" as OscillatorType },
        ]
      : [
          { freq: 659.25, start: now, duration: 0.14, type: "triangle" as OscillatorType },
          { freq: 880.0, start: now + 0.16, duration: 0.20, type: "sine" as OscillatorType },
        ];

    tones.forEach(({ freq, start, duration, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      // Smooth attack and decay envelope to prevent harsh pops
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.min(1.0, volume), start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });

    return true;
  } catch (err) {
    console.warn("Failed to play task buzzer sound:", err);
    return false;
  }
}

/**
 * Request desktop notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission !== "denied") {
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }
  return Notification.permission;
}

/**
 * Fire an OS/Browser level desktop notification
 */
export function sendDesktopNotification(title: string, options?: NotificationOptions & { onClick?: () => void }) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notif = new Notification(title, {
      icon: "/provision-smart-bg.jpg",
      badge: "/provision-smart-bg.jpg",
      silent: false,
      ...options,
    });

    if (options?.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }
  } catch (e) {
    console.warn("Desktop notification failed:", e);
  }
}
