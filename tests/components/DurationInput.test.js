import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DurationInput from '../../src/components/exercises/DurationInput.vue';

function mountDuration(props = {}) {
  return mount(DurationInput, {
    props: {
      minutes: 3,
      seconds: 40,
      ...props,
    },
  });
}

describe('DurationInput', () => {
  it('renders minutes and seconds inside one duration control', () => {
    const wrapper = mountDuration();

    expect(wrapper.get('[data-testid="duration-input"]').exists()).toBe(true);
    expect(wrapper.findAll('input')).toHaveLength(2);
    expect(wrapper.get('input[aria-label="Minutes"]').element.value).toBe('3');
    expect(wrapper.get('input[aria-label="Seconds"]').element.value).toBe('40');
  });

  it('emits numeric values for each segment', async () => {
    const onMinutesUpdate = vi.fn();
    const onSecondsUpdate = vi.fn();
    const wrapper = mountDuration({ 'onUpdate:minutes': onMinutesUpdate, 'onUpdate:seconds': onSecondsUpdate });
    const minutesInput = wrapper.get('input[aria-label="Minutes"]');
    const secondsInput = wrapper.get('input[aria-label="Seconds"]');

    minutesInput.element.value = '4';
    secondsInput.element.value = '25';
    minutesInput.element.dispatchEvent(new window.Event('input', { bubbles: true }));
    secondsInput.element.dispatchEvent(new window.Event('input', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(onMinutesUpdate).toHaveBeenCalledWith(4);
    expect(onSecondsUpdate).toHaveBeenCalledWith(25);
  });

  it('limits seconds to the valid range', async () => {
    const onSecondsUpdate = vi.fn();
    const wrapper = mountDuration({ 'onUpdate:seconds': onSecondsUpdate });
    const secondsInput = wrapper.get('input[aria-label="Seconds"]');

    secondsInput.element.value = '75';
    secondsInput.element.dispatchEvent(new window.Event('input', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(onSecondsUpdate).toHaveBeenCalledWith(59);
  });
});
