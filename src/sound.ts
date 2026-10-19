/* ========================================================================
 * Звук дерева: каждая ветка — шаг по ладу (Y вверх, X вниз), каждая строка — такт.
 * Чистый Web Audio API, без библиотек.
 * ===================================================================== */

/** Мажорная пентатоника в полутонах от тоники: любые сочетания нот звучат без фальши. */
const SCALE = [0, 2, 4, 7, 9];
/** Тоника — нота корня CORE (до первой октавы), Гц. */
const BASE_FREQ = 261.63;
/** Сколько звучит одна нота, с. */
const NOTE_LENGTH = 0.6;
/** Глубже этого уровня звук больше не затухает, иначе на длинных деревьях громкость уйдёт в ноль. */
const FADE_DEPTH = 12;
/** Ступени лада заворачиваются в диапазон от одной октавы вниз до двух вверх, чтобы бесконечный рост не уходил в инфразвук и писк. */
const LOW_DEGREE = -SCALE.length;
const DEGREE_RANGE = SCALE.length * 3;

export type SoundNote = { pitch: number; depth: number; accent?: boolean };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function getContext(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null; // Web Audio недоступен — просто молчим
    }
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Браузер разрешает звук только после действия пользователя — вызываем в обработчике клика. */
export function unlockAudio() {
  const c = getContext();
  if (c?.state === 'suspended') void c.resume();
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted() {
  return muted;
}

/** Ступень лада → частота. Ступени за пределами SCALE уходят в соседние октавы. */
function degreeToFreq(rawDegree: number): number {
  const degree = LOW_DEGREE + ((((rawDegree - LOW_DEGREE) % DEGREE_RANGE) + DEGREE_RANGE) % DEGREE_RANGE);
  const octave = Math.floor(degree / SCALE.length);
  const step = degree - octave * SCALE.length;
  return BASE_FREQ * 2 ** ((octave * 12 + SCALE[step]) / 12);
}

function playNoteAt(c: AudioContext, note: SoundNote, time: number, volume: number) {
  const osc = c.createOscillator();
  // Акцентные ноты (листья на максимальной глубине) звучат ярче
  osc.type = note.accent ? 'sawtooth' : 'triangle';
  osc.frequency.value = degreeToFreq(note.pitch);

  // Чем глубже узел, тем мягче и тише звук — дерево «затухает», но не глубже FADE_DEPTH
  const depth = Math.min(note.depth, FADE_DEPTH);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 4000 / (1 + depth * 0.35);

  const env = c.createGain();
  const peak = volume * (1 - depth * 0.05);
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(peak, time + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, time + NOTE_LENGTH);

  osc.connect(filter).connect(env).connect(master!);
  osc.start(time);
  osc.stop(time + NOTE_LENGTH + 0.05);
}

/**
 * Играет строку дерева арпеджио слева направо в пределах spreadMs.
 * Чем больше нот, тем тише каждая, чтобы не было каши.
 */
export function playRow(notes: SoundNote[], spreadMs = 800) {
  if (muted || notes.length === 0) return;
  const c = getContext();
  if (!c) return;

  const step = Math.min(spreadMs / 1000 / notes.length, 0.12);
  const volume = 0.35 / Math.sqrt(notes.length);
  const start = c.currentTime + 0.02;
  notes.forEach((note, i) => playNoteAt(c, note, start + i * step, volume));
}
