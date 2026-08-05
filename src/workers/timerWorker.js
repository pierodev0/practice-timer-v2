/**
 * Web Worker — runs a 1-second interval tick reliably
 * even when the browser tab is hidden.
 *
 * Messages:
 *   'start' → begin interval
 *   'stop'  → clear interval
 *
 * Posts:
 *   'tick'  → every 1000ms while running
 */

let intervalId = null;

self.onmessage = function (e) {
  if (e.data === 'start') {
    if (intervalId === null) {
      intervalId = setInterval(() => {
        self.postMessage('tick');
      }, 1000);
    }
  } else if (e.data === 'stop') {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
