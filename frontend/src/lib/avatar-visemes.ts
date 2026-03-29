export const AZURE_VISEME_TO_RPM: Record<number, string> = {
  0: "viseme_sil",
  1: "viseme_aa",
  2: "viseme_aa",
  3: "viseme_O",
  4: "viseme_E",
  5: "viseme_E",
  6: "viseme_I",
  7: "viseme_U",
  8: "viseme_O",
  9: "viseme_aa",
  10: "viseme_O",
  11: "viseme_aa",
  12: "viseme_sil",
  13: "viseme_RR",
  14: "viseme_nn",
  15: "viseme_SS",
  16: "viseme_SS",
  17: "viseme_TH",
  18: "viseme_FF",
  19: "viseme_DD",
  20: "viseme_kk",
  21: "viseme_PP",
};

export function getVisemeBlendShapeName(id: number): string {
  return AZURE_VISEME_TO_RPM[id] ?? "viseme_sil";
}
