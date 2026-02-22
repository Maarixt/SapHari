/**
 * Interaction layer: event handlers only. No rendering.
 * Wires Stage/component/wire/pin events to store actions.
 */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { CircuitState } from '../store/circuitStore';
import { canCommitWire, toSimState } from '../store/circuitStore';
import { findPin, orthogonalPath } from '../helpers';

export interface CircuitInteractionApi {
  clearSelection: () => void;
  selectComponent: (id: string, shift?: boolean) => void;
  selectWire: (id: string, shift?: boolean) => void;
  moveComponent: (id: string, x: number, y: number, noSnap?: boolean) => void;
  beginWire: (componentId: string, pinId: string) => void;
  commitWire: (toComponentId: string, toPinId: string, points?: number[]) => void;
  cancelWire: () => void;
  deleteComponent: (id: string) => void;
  deleteWire: (id: string) => void;
}

export function useCircuitInteraction(state: CircuitState, api: CircuitInteractionApi) {
  const wireGestureStartRef = useRef<{ compId: string; pinId: string } | null>(null);
  const justCommittedRef = useRef(false);
  const onStageClick = useCallback(
    (shift?: boolean) => {
      if (state.tool === 'wire') {
        api.cancelWire();
      } else if (!shift) {
        api.clearSelection();
      }
    },
    [api, state.tool]
  );

  const onComponentSelect = useCallback(
    (id: string, shift?: boolean) => {
      if (state.tool === 'select') {
        api.selectComponent(id, shift);
      }
    },
    [api, state.tool]
  );

  const onWireSelect = useCallback(
    (id: string, shift?: boolean) => {
      if (state.tool === 'select') {
        api.selectWire(id, shift);
      }
    },
    [api, state.tool]
  );

  const onComponentDragEnd = useCallback(
    (id: string, x: number, y: number, evt?: MouseEvent) => {
      api.moveComponent(id, x, y, evt?.altKey);
    },
    [api]
  );

  const onComponentDelete = useCallback(
    (id: string) => {
      api.deleteComponent(id);
    },
    [api]
  );

  const onWireDelete = useCallback(
    (id: string) => {
      api.deleteWire(id);
    },
    [api]
  );

  const onPinClick = useCallback(
    (compId: string, pinId: string, shift?: boolean) => {
      if (state.tool === 'select') {
        api.selectComponent(compId, shift);
        return;
      }
      if (state.tool === 'wire') {
        if (!state.activeWireStart) {
          if (justCommittedRef.current) {
            justCommittedRef.current = false;
            return;
          }
          api.beginWire(compId, pinId);
        } else if (state.activeWireStart.componentId === compId && state.activeWireStart.pinId === pinId) {
          const justStarted = wireGestureStartRef.current?.compId === compId && wireGestureStartRef.current?.pinId === pinId;
          wireGestureStartRef.current = null;
          if (!justStarted) api.cancelWire();
        } else {
          if (!canCommitWire(state, compId, pinId)) {
            toast.error(`Cannot connect to ${compId}:${pinId}`);
            api.cancelWire();
            return;
          }
          wireGestureStartRef.current = null;
          justCommittedRef.current = true;
          const simState = toSimState(state);
          const fromPin = findPin(simState, state.activeWireStart.componentId, state.activeWireStart.pinId, state.viewMode);
          const toPin = findPin(simState, compId, pinId, state.viewMode);
          const points = fromPin && toPin ? orthogonalPath(fromPin.x, fromPin.y, toPin.x, toPin.y) : undefined;
          api.commitWire(compId, pinId, points);
          toast.success(
            `Wire connected: ${state.activeWireStart.componentId}:${state.activeWireStart.pinId} → ${compId}:${pinId}`
          );
        }
        return;
      }
      api.beginWire(compId, pinId);
    },
    [state.tool, state.activeWireStart, api]
  );

  const onPinPointerDown = useCallback(
    (compId: string, pinId: string) => {
      if (state.tool === 'wire' && !state.activeWireStart) {
        wireGestureStartRef.current = { compId, pinId };
        api.beginWire(compId, pinId);
      }
    },
    [state.tool, state.activeWireStart, api]
  );

  const onPinPointerUp = useCallback(
    (compId: string, pinId: string) => {
      if (state.tool !== 'wire' || !state.activeWireStart) return;
      const { activeWireStart } = state;
      if (activeWireStart.componentId === compId && activeWireStart.pinId === pinId) {
        return;
      }
      if (!canCommitWire(state, compId, pinId)) {
        toast.error(`Cannot connect to ${compId}:${pinId}`);
        api.cancelWire();
        return;
      }
      justCommittedRef.current = true;
      const simState = toSimState(state);
      const fromPin = findPin(simState, activeWireStart.componentId, activeWireStart.pinId, state.viewMode);
      const toPin = findPin(simState, compId, pinId, state.viewMode);
      const points = fromPin && toPin ? orthogonalPath(fromPin.x, fromPin.y, toPin.x, toPin.y) : undefined;
      api.commitWire(compId, pinId, points);
      toast.success(
        `Wire connected: ${activeWireStart.componentId}:${activeWireStart.pinId} → ${compId}:${pinId}`
      );
    },
    [state.tool, state.activeWireStart, state, api]
  );

  return {
    onStageClick,
    onComponentSelect,
    onWireSelect,
    onComponentDragEnd,
    onComponentDelete,
    onWireDelete,
    onPinClick,
    onPinPointerDown,
    onPinPointerUp,
  };
}
