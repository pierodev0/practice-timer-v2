/**
 * Port for the remote sync backend.
 *
 * The SyncEngine only knows this contract — never Firebase, Supabase, or any
 * other backend. A backend adapter implements these methods.
 *
 * @typedef {Object} SyncBackend
 * @property {(uid: string, operations: Array<Object>) => Promise<void>} push
 * @property {(uid: string, opts: {since?: number}) => Promise<{records: Array<Object>, newestTimestamp: number}>} pull
 * @property {(uid: string, deviceId: string, onChange: () => void) => () => void} listen
 * @property {(uid: string, entity: string, entityId: string, record: Object) => Promise<void>} applyRemote
 */

/**
 * Validates that an object implements the SyncBackend contract.
 * @param {Object} backend
 * @returns {Object} the same backend
 * @throws {Error} if a required method is missing
 */
export function assertBackend(backend) {
  const required = ['push', 'pull', 'listen', 'applyRemote'];
  for (const method of required) {
    if (typeof backend?.[method] !== 'function') {
      throw new Error(`SyncBackend must implement ${method}()`);
    }
  }
  return backend;
}

export default assertBackend;
