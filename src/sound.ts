const KEY = 'patriota-foragido:sound';

// Fallback para quando o localStorage estiver indisponivel.
let memoryEnabled = true;

export function loadSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // localStorage indisponivel: usa apenas a memoria.
  }
  return memoryEnabled;
}

export function saveSoundEnabled(enabled: boolean): void {
  memoryEnabled = enabled;
  try {
    localStorage.setItem(KEY, String(enabled));
  } catch {
    // Sem persistencia: o valor segue em memoria.
  }
}

export function soundLabel(enabled: boolean): string {
  return enabled ? 'SOM: LIGADO' : 'SOM: DESLIGADO';
}
