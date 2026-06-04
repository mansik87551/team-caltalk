import { describe, it, expect } from 'vitest';
import state from '../../src/domain/change-request-state.js';

const { STATUS, canTransition, isTerminal } = state;

describe('canTransition (BR-09)', () => {
  it('canTransition: requested → applied allowed (BR-09/AC-07)', () => {
    expect(canTransition(STATUS.REQUESTED, STATUS.APPLIED)).toBe(true);
  });

  it('canTransition: requested → rejected allowed (BR-09)', () => {
    expect(canTransition(STATUS.REQUESTED, STATUS.REJECTED)).toBe(true);
  });

  it('canTransition: applied → rejected rejected (terminal) (BR-09/AC-08)', () => {
    expect(canTransition(STATUS.APPLIED, STATUS.REJECTED)).toBe(false);
  });

  it('canTransition: rejected → applied rejected (terminal) (BR-09/AC-08)', () => {
    expect(canTransition(STATUS.REJECTED, STATUS.APPLIED)).toBe(false);
  });

  it('canTransition: applied → applied rejected (no self re-transition) (BR-09/AC-08)', () => {
    expect(canTransition(STATUS.APPLIED, STATUS.APPLIED)).toBe(false);
  });

  it('canTransition: requested → requested rejected (BR-09)', () => {
    expect(canTransition(STATUS.REQUESTED, STATUS.REQUESTED)).toBe(false);
  });

  it('canTransition: unknown status rejected (BR-09)', () => {
    expect(canTransition('unknown', STATUS.APPLIED)).toBe(false);
    expect(canTransition(STATUS.REQUESTED, 'unknown')).toBe(false);
  });
});

describe('isTerminal (BR-09)', () => {
  it('isTerminal: applied and rejected are terminal (BR-09/AC-08)', () => {
    expect(isTerminal(STATUS.APPLIED)).toBe(true);
    expect(isTerminal(STATUS.REJECTED)).toBe(true);
  });

  it('isTerminal: requested is not terminal (BR-09)', () => {
    expect(isTerminal(STATUS.REQUESTED)).toBe(false);
  });
});
