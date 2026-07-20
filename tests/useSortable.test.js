import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useSortable', () => {
  let mockSortableInstance;
  let useSortable;
  let Sortable;

  beforeEach(async () => {
    mockSortableInstance = {
      destroy: vi.fn(),
    };
    Sortable = vi.fn(function() { return mockSortableInstance; });
    globalThis.Sortable = Sortable;

    // Set up DOM for Sortable
    document.body.innerHTML = '<div id="exercise-list"><div class="ex">1</div><div class="ex">2</div></div>';

    const mod = await import('../src/composables/useSortable.js');
    useSortable = mod.useSortable;
  });

  it('calls Sortable constructor with container and options', () => {
    const onReorder = vi.fn();
    const sortable = useSortable({ containerId: 'exercise-list', onReorder });
    sortable.setup();

    expect(Sortable).toHaveBeenCalledOnce();
    const [el, options] = Sortable.mock.calls[0];
    expect(el.id).toBe('exercise-list');
    expect(options.handle).toBe('.drag-handle');
    expect(typeof options.onEnd).toBe('function');
  });

  it('calls onReorder with oldIndex and newIndex on drag end', () => {
    const onReorder = vi.fn();
    const sortable = useSortable({ containerId: 'exercise-list', onReorder });
    sortable.setup();

    const { onEnd } = Sortable.mock.calls[0][1];
    onEnd({ oldIndex: 0, newIndex: 2 });
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it('destroys previous Sortable instance on subsequent setup calls', () => {
    const sortable = useSortable({ containerId: 'exercise-list', onReorder: vi.fn() });
    sortable.setup();
    sortable.setup();

    expect(mockSortableInstance.destroy).toHaveBeenCalledOnce();
    expect(Sortable).toHaveBeenCalledTimes(2);
  });

  it('has a destroy method that cleans up', () => {
    const sortable = useSortable({ containerId: 'exercise-list', onReorder: vi.fn() });
    sortable.setup();
    sortable.destroy();
    expect(mockSortableInstance.destroy).toHaveBeenCalledOnce();
  });

  it('returns null instance and does not throw when container does not exist', () => {
    const sortable = useSortable({ containerId: 'nonexistent', onReorder: vi.fn() });
    const result = sortable.setup();
    expect(result).toBeNull();
    expect(Sortable).not.toHaveBeenCalled();
  });

  it('returns null and warns when Sortable is not available globally', () => {
    delete globalThis.Sortable;
    const sortable = useSortable({ containerId: 'exercise-list', onReorder: vi.fn() });
    const result = sortable.setup();
    expect(result).toBeNull();
  });
});
