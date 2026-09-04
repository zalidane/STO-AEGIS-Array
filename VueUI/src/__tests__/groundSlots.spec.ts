import { describe, expect, it } from "vitest";
import {
  GROUND_DEVICE_BASE_SLOTS,
  GROUND_KIT_MODULE_BASE_SLOTS,
  groundDeviceSlotCount,
  groundKitModuleSlotCount,
} from "@/logic/loadout/groundSlots";

describe("ground captain slots", () => {
  it("includes the upgrade kit module and device sockets", () => {
    expect(GROUND_KIT_MODULE_BASE_SLOTS).toBe(4);
    expect(GROUND_DEVICE_BASE_SLOTS).toBe(2);
    expect(groundKitModuleSlotCount()).toBe(5);
    expect(groundDeviceSlotCount()).toBe(3);
  });
});
