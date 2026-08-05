import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ExerciseFormFields from '../../src/components/exercises/ExerciseFormFields.vue';

const baseProps = {
  mode: 'timer',
  title: 'Scale',
  statName: '',
  bpm: 100,
  reps: 1,
  minutes: 2,
  seconds: 0,
  autoStart: true,
  targetPerfect: 5,
  useCustomStat: false,
};

function mountFields(props = {}) {
  return mount(ExerciseFormFields, { props: { ...baseProps, ...props } });
}

describe('ExerciseFormFields', () => {
  it('renders timer fields only for timer mode', () => {
    const wrapper = mountFields();

    expect(wrapper.text()).toContain('Tempo (BPM)');
    expect(wrapper.text()).toContain('Duration');
    expect(wrapper.text()).toContain('Minutes');
    expect(wrapper.text()).toContain('Seconds');
    expect(wrapper.find('[data-testid="duration-input"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Auto-Start');
    expect(wrapper.text()).not.toContain('Target Perfectas');
    expect(wrapper.text()).not.toContain('Target Reps');
  });

  it('renders duration above the tempo and auto-start settings', () => {
    const wrapper = mountFields();
    const settingsGrid = wrapper.get('[data-testid="timer-settings-grid"]');
    const html = wrapper.html();

    expect(settingsGrid.findAll(':scope > *')).toHaveLength(2);
    expect(settingsGrid.classes()).toContain('space-y-4');
    expect(settingsGrid.text()).toContain('Tempo (BPM)');
    expect(settingsGrid.text()).toContain('Auto-Start');
    expect(html.indexOf('data-testid="duration-input"')).toBeLessThan(html.indexOf('data-testid="timer-settings-grid"'));
  });

  it('does not render the duration control outside timer mode', () => {
    expect(mountFields({ mode: 'perfect-reps' }).find('[data-testid="duration-input"]').exists()).toBe(false);
    expect(mountFields({ mode: 'count' }).find('[data-testid="duration-input"]').exists()).toBe(false);
  });

  it('forwards duration segment changes', async () => {
    const onMinutesUpdate = vi.fn();
    const onSecondsUpdate = vi.fn();
    const wrapper = mountFields({
      'onUpdate:minutes': onMinutesUpdate,
      'onUpdate:seconds': onSecondsUpdate,
    });
    const minutesInput = wrapper.get('input[aria-label="Minutes"]');
    const secondsInput = wrapper.get('input[aria-label="Seconds"]');

    minutesInput.element.value = '3';
    secondsInput.element.value = '40';
    minutesInput.element.dispatchEvent(new window.Event('input', { bubbles: true }));
    secondsInput.element.dispatchEvent(new window.Event('input', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(onMinutesUpdate).toHaveBeenCalledWith(3);
    expect(onSecondsUpdate).toHaveBeenCalledWith(40);
  });

  it('renders perfect-reps fields only for perfect-reps mode', () => {
    const wrapper = mountFields({ mode: 'perfect-reps' });

    expect(wrapper.text()).toContain('Target Perfectas');
    expect(wrapper.text()).toContain('Tempo (BPM)');
    expect(wrapper.text()).not.toContain('Minutes');
    expect(wrapper.text()).not.toContain('Target Reps');
  });

  it('renders the duration control for reference timers', () => {
    const perfect = mountFields({ mode: 'perfect-reps', timerPolicy: 'reference' });
    const count = mountFields({ mode: 'count', timerPolicy: 'reference' });

    expect(perfect.text()).toContain('Reference timer');
    expect(perfect.text()).toContain('Reference duration');
    expect(perfect.find('[data-testid="duration-input"]').exists()).toBe(true);
    expect(count.text()).toContain('Reference timer');
    expect(count.text()).toContain('Reference duration');
    expect(count.find('[data-testid="duration-input"]').exists()).toBe(true);
  });

  it('hides reference duration when the policy is none', () => {
    const wrapper = mountFields({ mode: 'count', timerPolicy: 'none' });

    expect(wrapper.text()).toContain('Reference timer');
    expect(wrapper.find('[data-testid="duration-input"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Reference duration');
  });

  it('shows a disabled reference timer by default for count creation', () => {
    const wrapper = mountFields({ mode: 'count', timerPolicy: 'none' });
    const toggle = wrapper.find('input[type="checkbox"]');

    expect(toggle.exists()).toBe(true);
    expect(toggle.element.checked).toBe(false);
    expect(wrapper.text()).not.toContain('Reference seconds');
  });

  it('renders count fields only for count mode', () => {
    const wrapper = mountFields({ mode: 'count' });

    expect(wrapper.text()).toContain('Target Reps');
    expect(wrapper.text()).not.toContain('Target Perfectas');
  });

  it('renders free mode information without configuration fields', () => {
    const wrapper = mountFields({ mode: 'free' });

    expect(wrapper.text()).toContain('Sin timer ni target');
    expect(wrapper.text()).not.toContain('Tempo (BPM)');
    expect(wrapper.text()).not.toContain('Target Reps');
  });

  it('renders the mode selector only when enabled', () => {
    expect(mountFields({ showModeSelector: true }).text()).toContain('Mode');
    expect(mountFields({ showModeSelector: false }).text()).not.toContain('Mode');
  });

  it('renders one selector option for each supported mode', () => {
    const wrapper = mountFields({ showModeSelector: true });

    const modeButtons = wrapper.findAll('button').filter(button => [
      'Cronometrado', 'Perfectas', 'Contador', 'Libre',
    ].includes(button.text().trim()));

    expect(modeButtons).toHaveLength(4);
    expect(wrapper.text()).toContain('Cronometrado');
    expect(wrapper.text()).toContain('Perfectas');
    expect(wrapper.text()).toContain('Contador');
    expect(wrapper.text()).toContain('Libre');
  });
});
