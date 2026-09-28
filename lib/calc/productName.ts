/** Product display name — Thai name is optional, so only append it when present. */
export function productLabel(nameEn: string, nameTh: string | null | undefined): string {
  return nameTh ? `${nameEn} (${nameTh})` : nameEn;
}
