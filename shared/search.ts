/**
 * Folds text for search: NFC, lowercase, Vietnamese tone and vowel marks removed, and
 * đ mapped to d, so "banh can" matches "Bánh căn".
 */
export function searchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
