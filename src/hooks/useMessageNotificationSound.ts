import { useCallback, useRef } from 'react';

// Create a simple notification sound using Web Audio API
const createNotificationSound = (): HTMLAudioElement | null => {
  try {
    // Use a data URL for a simple notification beep
    // This is a short, pleasant notification sound encoded as base64
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for a pleasant chime
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    return null;
  } catch (error) {
    console.error('Error creating notification sound:', error);
    return null;
  }
};

// Play a synthesized notification sound
const playNotificationBeep = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First note (higher)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.setValueAtTime(880, audioContext.currentTime);
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0, audioContext.currentTime);
    gain1.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.15);
    
    // Second note (even higher, for a pleasant two-tone chime)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.1); // E6 note
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
    gain2.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
    osc2.start(audioContext.currentTime + 0.1);
    osc2.stop(audioContext.currentTime + 0.35);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export function useMessageNotificationSound() {
  const hasInteractedRef = useRef(false);

  // Track user interaction for audio context (browsers require user gesture)
  const enableSound = useCallback(() => {
    hasInteractedRef.current = true;
  }, []);

  const playSound = useCallback(() => {
    // Only play if user has interacted with the page (browser requirement)
    if (!hasInteractedRef.current) {
      // Try to play anyway - modern browsers often allow it after any interaction
      hasInteractedRef.current = true;
    }
    
    playNotificationBeep();
  }, []);

  return { playSound, enableSound };
}
