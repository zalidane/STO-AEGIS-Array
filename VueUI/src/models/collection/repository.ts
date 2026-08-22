import type { CollectionState } from "@/logic/collection/types";

export interface CollectionRepository {
  load(): CollectionState;
  save(state: CollectionState): void;
}
