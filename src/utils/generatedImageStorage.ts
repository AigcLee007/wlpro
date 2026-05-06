const LOCAL_ORIGINAL_SEGMENTS = [
  "/generated-assets/original/",
  "/generated-assets/line4/original/",
];
const LOCAL_THUMB_SEGMENTS = [
  "/generated-assets/thumb/",
  "/generated-assets/line4/thumb/",
];

export const isLocalLine4StoredImage = (value?: string | null): boolean =>
  typeof value === "string" &&
  LOCAL_ORIGINAL_SEGMENTS.some((segment) => value.includes(segment));

export const getLocalLine4ThumbnailUrl = (
  value?: string | null,
): string | null => {
  if (!isLocalLine4StoredImage(value)) return null;
  const originalSegmentIndex = LOCAL_ORIGINAL_SEGMENTS.findIndex((segment) =>
    value!.includes(segment),
  );
  const originalSegment = LOCAL_ORIGINAL_SEGMENTS[originalSegmentIndex];
  const thumbSegment = LOCAL_THUMB_SEGMENTS[originalSegmentIndex] || LOCAL_THUMB_SEGMENTS[0];
  return value!.replace(originalSegment, thumbSegment).replace(/\.[a-zA-Z0-9]+(?:\?|#|$)/, ".webp$1");
};

export const getPreferredImageDisplayUrl = (
  originalUrl?: string | null,
  thumbnailUrl?: string | null,
): string => {
  if (thumbnailUrl) return thumbnailUrl;
  return getLocalLine4ThumbnailUrl(originalUrl) || originalUrl || "";
};

export const isOlderThanHours = (
  isoTimestamp?: string | null,
  hours = 120,
): boolean => {
  if (!isoTimestamp) return false;
  const parsed = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(parsed)) return false;
  return Date.now() - parsed > hours * 60 * 60 * 1000;
};
