export function getImageUrl(img) {
  if (img.is_reference) {
    return `/api/files/reference/${img.filename}`;
  }
  return `/api/files/${img.user_id}/images/${img.filename}`;
}
