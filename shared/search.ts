/**
 * Folds text for search: decomposed, combining marks (Vietnamese tones and vowel marks)
 * removed, đ mapped to d, and lowercased, so "banh can" matches "Bánh căn".
 */
export function searchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
