export interface ImportConfig<
  TRaw extends Record<string, unknown>,
  TMapped extends Record<string, unknown>,
> {
  model: string;
  /** Upsert by these mapped fields. Omit (or empty) when using replace strategy. */
  uniqueFields?: readonly [keyof TMapped, ...(keyof TMapped)[]];
  /** Default: upsert when uniqueFields present; replace clears the table then inserts. */
  strategy?: "upsert" | "replace";
  mapper: (row: TRaw) => TMapped;
}
