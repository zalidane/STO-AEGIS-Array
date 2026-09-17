import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CaptainTraitsPanel from "@/components/loadout/CaptainTraitsPanel.vue";
import BoffStationsPanel from "@/components/loadout/BoffStationsPanel.vue";
import { buildCaptainTraitSlots } from "@/logic/loadout/captainTraits";
import { buildBoffStations } from "@/logic/loadout/boffPowers";
import { getBoffSeatColors, toBoffSeatView } from "@/mappers/boffColors";
import { abbreviateBoffPart } from "@/utils/formatters";
import { boffRankAbbrev } from "@/logic/loadout/boffPowers";

describe("shared loadout panels", () => {
  it("renders captain trait fills without picker ownership chrome", async () => {
    const slots = buildCaptainTraitSlots({});
    const personal = slots.filter((slot) => slot.group === "personalSpace");
    const wrapper = mount(CaptainTraitsPanel, {
      props: {
        title: "Captain space traits",
        readonly: true,
        sections: [
          {
            group: "personalSpace",
            label: "Personal Space Traits",
            slots: personal.slice(0, 1).map((slot) => ({
              slot,
              item: { name: "Crippling Fire", image: null },
              ownedCount: 4,
            })),
          },
        ],
      },
    });
    expect(wrapper.text()).toContain("Captain space traits");
    expect(wrapper.find(".trait-slot--filled").exists()).toBe(true);
    expect(wrapper.find(".trait-slot__owned").exists()).toBe(false);
    await wrapper.find(".trait-slot").trigger("click");
    expect(wrapper.emitted("pick")).toBeUndefined();
  });

  it("renders BOff powers read-only without career pickers", async () => {
    const station = buildBoffStations("Commander Tactical", {})[0]!;
    const view = toBoffSeatView(station.raw);
    const colors = getBoffSeatColors(station.seat);
    const commander = station.slots.find((s) => s.id === "boff-0-commander")!;
    const wrapper = mount(BoffStationsPanel, {
      props: {
        readonly: true,
        stations: [
          {
            station,
            label: view.label,
            careerLabel: `${boffRankAbbrev(station.seat.rank)} ${abbreviateBoffPart(station.seat.career)}`,
            careerTheme: colors.career,
            slots: [
              {
                slot: commander,
                item: { name: "Tactical Team III", image: null },
              },
            ],
          },
        ],
      },
    });
    expect(wrapper.text()).toContain("Bridge officers");
    expect(wrapper.text()).toContain("Tactical Team III");
    expect(wrapper.find(".boff-station__careers").exists()).toBe(false);
    await wrapper.find(".boff-slot").trigger("click");
    expect(wrapper.emitted("pick")).toBeUndefined();
  });
});
