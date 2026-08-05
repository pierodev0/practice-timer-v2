import { nanoid } from 'nanoid';

const STORAGE_KEY = 'music-device-id';

export function getDeviceId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = nanoid();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
