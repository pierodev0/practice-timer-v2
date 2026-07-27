/**
 * useSortable — wrapper for SortableJS drag-and-drop.
 *
 * @param {Object} options
 * @param {string}   options.containerId - ID of the sortable container element
 * @param {Function} options.onReorder   - (oldIndex, newIndex) when item is dropped
 */
export function useSortable({ containerId, onReorder } = {}) {
  let sortableInstance = null;

  function setup() {
    const el = document.getElementById(containerId);
    if (!el || typeof globalThis.Sortable === 'undefined') {
      return null;
    }

    if (sortableInstance) {
      sortableInstance.destroy();
    }

    sortableInstance = new Sortable(el, {
      animation: 200,
      delay: 200,
      delayOnTouchOnly: true,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      scroll: true,
      scrollSensitivity: 40,
      scrollSpeed: 10,
      forceFallback: true,
      fallbackClass: 'sortable-fallback',
      onEnd: (evt) => {
        if (evt.oldIndex !== evt.newIndex && onReorder) {
          onReorder(evt.oldIndex, evt.newIndex);
        }
      },
    });

    return sortableInstance;
  }

  function destroy() {
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
  }

  return { setup, destroy };
}
