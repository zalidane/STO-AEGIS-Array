export interface ImportConfig<
  TRaw extends Record<string, unknown>,
  TMapped extends Record<string, unknown>,
> {
  model: string;
  uniqueFields: readonly [keyof TMapped, ...(keyof TMapped)[]];
  mapper: (row: TRaw) => TMapped;
}
