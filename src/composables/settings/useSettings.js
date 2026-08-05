/**
 * useSettings — settings state for presentation layer.
 *
 * Wraps useSettingsStore so views never import stores directly.
 * Exposes reactive state and actions for the settings UI.
 */
import { useSettingsStore } from '../../stores/useSettingsStore.js';

export function useSettings() {
  const settingsStore = useSettingsStore();

  return {
    fullscreenPlay: settingsStore.fullscreenPlay,
    toggleFullscreenPlay: () => settingsStore.toggleFullscreenPlay(),
  };
}
