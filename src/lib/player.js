// @ts-nocheck
/**
 * FirehosePlayer — the replay engine. Owns the 24h clock, the queue of
 * tweets for the selected day, and which tweets have "flown in" so far.
 * Pure logic, no DOM: the SPA subscribes to it like any Svelte store.
 */
import { writable, get } from "svelte/store";

const DAY_SECS = 86400;
const TICK_MS = 200;

export function createPlayer() {
  const { subscribe, set, update } = writable({
    clock: 0,        // seconds since midnight on the replay clock
    playing: false,
    speed: 60,       // 0 = show everything at once
    queue: [],       // normalized tweets, sorted by secs
    visible: [],     // tweets whose secs <= clock
    done: false,
  });

  let timer = null;

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function advance(dt) {
    update((s) => {
      if (!s.playing) return s;
      if (s.speed === 0) {
        return { ...s, clock: DAY_SECS, visible: s.queue, playing: false, done: true };
      }
      const clock = Math.min(DAY_SECS, s.clock + dt * s.speed);
      const visible = s.queue.filter((t) => t.secs <= clock);
      const done = clock >= DAY_SECS;
      if (done) stopTimer();
      return { ...s, clock, visible, done, playing: done ? false : s.playing };
    });
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => advance(TICK_MS / 1000), TICK_MS);
  }

  const api = {
    subscribe,
    /** Load a fresh sorted queue and reset the clock. */
    load(queue, speed = 60) {
      stopTimer();
      set({ clock: 0, playing: false, speed, queue: [...queue], visible: [], done: queue.length === 0 });
    },
    play() {
      const s = get({ subscribe });
      if (s.done || s.queue.length === 0) return;
      if (s.speed === 0) {
        update((st) => ({ ...st, clock: DAY_SECS, visible: st.queue, playing: false, done: true }));
        return;
      }
      update((st) => ({ ...st, playing: true }));
      startTimer();
    },
    pause() {
      stopTimer();
      update((s) => ({ ...s, playing: false }));
    },
    toggle() {
      const s = get({ subscribe });
      if (s.playing) api.pause();
      else if (s.done) api.restart();
      else api.play();
    },
    restart() {
      const s = get({ subscribe });
      api.load(s.queue, s.speed);
      api.play();
    },
    /** Jump the clock to a time; visible recomputes. */
    seek(secs) {
      const s = get({ subscribe });
      const clock = Math.max(0, Math.min(DAY_SECS, secs));
      update((st) => ({
        ...st,
        clock,
        visible: st.queue.filter((t) => t.secs <= clock),
        done: clock >= DAY_SECS,
        playing: clock >= DAY_SECS ? false : st.playing,
      }));
      if (clock >= DAY_SECS) stopTimer();
    },
    /** Skip the clock forward to the next tweet that hasn't flown in yet. */
    jumpToNext() {
      const s = get({ subscribe });
      const next = s.queue.find((t) => t.secs > s.clock);
      if (next) api.seek(next.secs);
      else api.seek(DAY_SECS);
    },
    setSpeed(speed) {
      update((s) => ({ ...s, speed }));
    },
    destroy() {
      stopTimer();
    },
  };
  return api;
}
