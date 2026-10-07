// Global "processing" indicator state. Axios interceptors call begin/end for
// mutating requests (POST/PUT/PATCH/DELETE) so every save/submit/add button in
// the ERP shows feedback while the call is in flight.

let inFlight = 0;
let clearTimer = null;
const listeners = new Set();

// Keep the overlay visible briefly so short requests don't blink.
const MIN_VISIBLE_MS = 600;

function emit() {
  const active = inFlight > 0;
  listeners.forEach((fn) => fn(active));
}

export function subscribeProcessing(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function beginProcessing() {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  inFlight += 1;
  emit();
}

export function endProcessing() {
  if (inFlight > 0) inFlight -= 1;
  if (inFlight === 0 && !clearTimer) {
    clearTimer = setTimeout(() => {
      clearTimer = null;
      emit();
    }, MIN_VISIBLE_MS);
  } else if (inFlight > 0) {
    emit();
  }
}