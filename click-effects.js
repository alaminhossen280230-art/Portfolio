// Optional dock interaction effects. Load this script from index.html with:
// <script src="./click-effects.js" defer></script>
(() => {
  const dock = document.querySelector(".glass-dock");
  if (!dock) return;

  let audioContext;
  function playDrop() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext ||= new AudioContext();
      if (audioContext.state === "suspended") audioContext.resume();

      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1050, now);
      oscillator.frequency.exponentialRampToValueAtTime(480, now + 0.095);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.14);
    } catch (_) {
      // Sound is optional; the tap animation and navigation should still work.
    }
  }

  dock.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest(".dock-item")) playDrop();
  }, { passive: true });
})();
