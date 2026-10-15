import { useCallback, useRef } from 'react';

/**
 * useNotificationSound
 * Synthesizes a soft, pleasant notification chime using the Web Audio API.
 * Requires no external audio files (never 404s, works completely offline).
 */
export const useNotificationSound = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: Soft D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.28);

      // Note 2: Harmonious A5 (880 Hz) slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.09);

      gain2.gain.setValueAtTime(0, now + 0.09);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.09);
      osc2.stop(now + 0.45);
    } catch {
      // Audio playback fails gracefully if browser autoplay policy blocks un-interacted audio
    }
  }, []);

  return { playNotificationSound };
};
