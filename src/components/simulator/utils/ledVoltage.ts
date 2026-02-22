/**
 * Shared LED voltage helpers: pin key format matches engine/buildNets.
 * Use for voltage-based LED on/brightness in renderers.
 */

const PIN_ALIAS: Record<string, string> = {
  P: 'pos',
  N: 'neg',
  A: 'anode',
  K: 'cathode',
  pin1: 'a',
  pin2: 'b',
};

function canonPinId(pinId: string): string {
  return PIN_ALIAS[pinId] ?? pinId;
}

/** Same format as engine2/buildNets: "${componentId}:${canonicalPinId}" */
export function pinKey(componentId: string, pinId: string): string {
  return `${componentId}:${canonPinId(pinId)}`;
}

export function getNetVoltage(
  netVoltageById: Record<string, number> | Map<string, number> | undefined,
  netId: string
): number | undefined {
  if (!netVoltageById) return undefined;
  if (netVoltageById instanceof Map) return netVoltageById.get(netId);
  return (netVoltageById as Record<string, number>)[netId];
}

/** Resolve pin to net id; pinToNetId may be Map or Record. Tries canonical and common aliases (anode/A, cathode/K). */
export function getPinNetId(
  pinToNetId: Map<string, string> | Record<string, string> | undefined,
  componentId: string,
  pinId: string
): string | undefined {
  if (!pinToNetId) return undefined;
  const get = (key: string): string | undefined =>
    pinToNetId instanceof Map ? pinToNetId.get(key) : (pinToNetId as Record<string, string>)[key];
  const k1 = pinKey(componentId, pinId);
  let v = get(k1);
  if (v !== undefined) return v;
  const canon = canonPinId(pinId);
  if (canon !== pinId) return get(pinKey(componentId, canon));
  if (pinId === 'anode') return get(pinKey(componentId, 'A'));
  if (pinId === 'A') return get(pinKey(componentId, 'anode'));
  if (pinId === 'cathode') return get(pinKey(componentId, 'K'));
  if (pinId === 'K') return get(pinKey(componentId, 'cathode'));
  return undefined;
}

const VF_DEFAULT = 1.8;

/**
 * Compute LED on state and brightness from net voltages.
 * Forward bias: vA - vK > vf => on.
 * Brightness: 0..1 from over-voltage (2V headroom = full).
 */
export function ledStateFromVoltages(
  pinToNetId: Map<string, string> | Record<string, string> | undefined,
  netVoltageById: Record<string, number> | Map<string, number> | undefined,
  componentId: string,
  vf: number = VF_DEFAULT
): { on: boolean; brightness: number } {
  const netA = getPinNetId(pinToNetId, componentId, 'anode') ?? getPinNetId(pinToNetId, componentId, 'A');
  const netK = getPinNetId(pinToNetId, componentId, 'cathode') ?? getPinNetId(pinToNetId, componentId, 'K');
  const vA = netA != null ? getNetVoltage(netVoltageById, netA) : undefined;
  const vK = netK != null ? getNetVoltage(netVoltageById, netK) : undefined;
  if (vA == null || vK == null) return { on: false, brightness: 0 };
  const dv = vA - vK;
  const isForward = dv > vf;
  const over = Math.max(0, dv - vf);
  const brightness = isForward ? Math.min(1, over / 2) : 0;
  return { on: isForward, brightness };
}
