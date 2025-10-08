// src/components/simulator/scriptRuntime.ts
let running = false;

export function runSimScript(code: string) {
  running = true;
  const HIGH = 1, LOW = 0;
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Expose minimal API
  const api = {
    HIGH, LOW,
    delay: sleep,
    digitalWrite: (pin: number, value: 0 | 1) => {
      window.dispatchEvent(new CustomEvent('sim:setOutput', { detail: { pin, state: value } }));
    },
    loop: async (fn: () => any) => {
      while (running) await fn();
    }
  };

  // eslint-disable-next-line no-new-func
  const f = new Function(...Object.keys(api), code);
  f(...Object.values(api));
}

export function stopSimScript() {
  running = false;
}
