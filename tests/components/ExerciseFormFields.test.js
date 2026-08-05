import { describe, it, expect } from 'vitest';
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
    expect(wrapper.text()).toContain('Minutes');
    expect(wrapper.text()).toContain('Seconds');
    expect(wrapper.text()).toContain('Auto-Start');
    expect(wrapper.text()).not.toContain('Target Perfectas');
    expect(wrapper.text()).not.toContain('Target Reps');
  });

  it('renders perfect-reps fields only for perfect-reps mode', () => {
    const wrapper = mountFields({ mode: 'perfect-reps' });

    expect(wrapper.text()).toContain('Target Perfectas');
    expect(wrapper.text()).toContain('Tempo (BPM)');
    expect(wrapper.text()).not.toContain('Minutes');
    expect(wrapper.text()).not.toContain('Target Reps');
  });

  it('renders reference timer fields for perfect-reps and count', () => {
    const perfect = mountFields({ mode: 'perfect-reps', timerPolicy: 'reference' });
    const count = mountFields({ mode: 'count', timerPolicy: 'reference' });

    expect(perfect.text()).toContain('Reference timer');
    expect(perfect.text()).toContain('Reference minutes');
    expect(count.text()).toContain('Reference timer');
    expect(count.text()).toContain('Reference seconds');
  });

  it('hides reference duration when the policy is none', () => {
    const wrapper = mountFields({ mode: 'count', timerPolicy: 'none' });

    expect(wrapper.text()).toContain('Reference timer');
    expect(wrapper.text()).not.toContain('Reference minutes');
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
