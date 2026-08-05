let ownerUid = null;

export function setSyncOwnerUid(uid) {
  ownerUid = uid || null;
}

export function getSyncOwnerUid() {
  return ownerUid;
}
