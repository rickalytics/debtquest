let audio;
const key = "debtquest-game-sound";
export function soundEnabled() {
  try {
    return localStorage.getItem(key) === "on";
  } catch {
    return false;
  }
}
export function setGameSound(enabled) {
  try {
    localStorage.setItem(key, enabled ? "on" : "off");
  } catch {}
}
// Called directly from a tap before the save starts, to honor audio gesture rules.
export function primeGameAudio() {
  if (!soundEnabled()) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audio ||= new Context();
    audio.resume().catch(() => {});
  } catch {}
}
export function playWinAudio(special = false) {
  if (!soundEnabled() || !audio || audio.state !== "running") return () => {};
  const nodes = [];
  try {
    const notes = special
      ? [523.25, 659.25, 783.99, 1046.5]
      : [659.25, 783.99, 1046.5];
    notes.forEach((frequency, i) => {
      const oscillator = audio.createOscillator(),
        gain = audio.createGain();
      const start = audio.currentTime + i * 0.085;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.28);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      nodes.push(oscillator);
    });
  } catch {}
  return () =>
    nodes.forEach((node) => {
      try {
        node.stop();
      } catch {}
    });
}
