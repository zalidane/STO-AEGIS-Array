import {
  EXTRA_GROUND_DEVICE_UNLOCK,
  EXTRA_GROUND_KIT_MODULE_UNLOCK,
} from "@/logic/captain/upgrade";

export const GROUND_KIT_MODULE_BASE_SLOTS = 4;
export const GROUND_DEVICE_BASE_SLOTS = 2;

/** Kit modules on an upgraded captain (4 base + 1 unlock). */
export function groundKitModuleSlotCount(): number {
  return GROUND_KIT_MODULE_BASE_SLOTS + EXTRA_GROUND_KIT_MODULE_UNLOCK;
}

/** Ground devices on an upgraded captain (2 base + 1 unlock). */
export function groundDeviceSlotCount(): number {
  return GROUND_DEVICE_BASE_SLOTS + EXTRA_GROUND_DEVICE_UNLOCK;
}
