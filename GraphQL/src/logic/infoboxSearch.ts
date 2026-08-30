import { equipmentInfoboxTypeWhere } from "./equipmentInfobox.js";
import { orTextFields, textContains } from "./searchText.js";

/** Identity fields: a hit here ranks with name matches. */
export const INFOBOX_IDENTITY_FIELDS = [
  "name",
  "type",
  "rarity",
  "who",
  "boundto",
] as const;

/** Body copy: Text/Head/Subhead 1–9. */
export const INFOBOX_BODY_FIELDS = [
  "text1",
  "text2",
  "text3",
  "text4",
  "text5",
  "text6",
  "text7",
  "text8",
  "text9",
  "head1",
  "head2",
  "head3",
  "head4",
  "head5",
  "head6",
  "head7",
  "head8",
  "head9",
  "subhead1",
  "subhead2",
  "subhead3",
  "subhead4",
  "subhead5",
  "subhead6",
  "subhead7",
  "subhead8",
  "subhead9",
] as const;

/** Name/type/rarity/who hits, limited to player equipment. */
export function infoboxIdentityWhere(text: string) {
  return {
    AND: [
      orTextFields(text, INFOBOX_IDENTITY_FIELDS),
      equipmentInfoboxTypeWhere(),
    ],
  };
}

/**
 * Text-field hits whose name does not also contain the query.
 * Keeps consoles like Sticky Web / D.O.M.I.N.O. visible when
 * "tetryon" / "phaser" would otherwise fill the name quota.
 */
export function infoboxBodyOnlyWhere(text: string) {
  return {
    AND: [
      orTextFields(text, INFOBOX_BODY_FIELDS),
      { NOT: { name: textContains(text) } },
      equipmentInfoboxTypeWhere(),
    ],
  };
}
