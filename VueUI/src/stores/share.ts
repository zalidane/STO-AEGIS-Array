import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  dropShareRecord,
  recordForCode,
  recordForLoadout,
  upsertShareRecord,
  type LocalShareRecord,
  type ShareVisibility,
} from "@/logic/share/records";
import { getShareRepository } from "@/models/share";

export const useShareStore = defineStore("share", () => {
  const repository = getShareRepository();
  const records = ref<LocalShareRecord[]>(repository.load());

  function persist() {
    repository.save(records.value);
  }

  function remember(record: LocalShareRecord) {
    records.value = upsertShareRecord(records.value, record);
    persist();
  }

  function forgetLoadout(loadoutId: string) {
    records.value = dropShareRecord(records.value, loadoutId);
    persist();
  }

  function forLoadout(loadoutId: string) {
    return recordForLoadout(records.value, loadoutId);
  }

  function forCode(publicCode: string) {
    return recordForCode(records.value, publicCode);
  }

  const byLoadoutId = computed(() => {
    const map = new Map<string, LocalShareRecord>();
    for (const row of records.value) {
      map.set(row.loadoutId, row);
    }
    return map;
  });

  return {
    records,
    byLoadoutId,
    remember,
    forgetLoadout,
    forLoadout,
    forCode,
  };
});

export type { ShareVisibility };
