import { describe, it, expect } from 'vitest';
import permissions from '../../src/domain/permissions.js';

const { ROLE, ACTION, can } = permissions;

describe('can(role, action) — 권한 매트릭스 (BR-03, docs/1 §5)', () => {
  describe('team_member (팀원)', () => {
    it('can: team_member cannot create schedule (BR-03/AC-05)', () => {
      expect(can(ROLE.MEMBER, ACTION.SCHEDULE_CREATE)).toBe(false);
    });

    it('can: team_member cannot update/delete schedule (BR-03/AC-05)', () => {
      expect(can(ROLE.MEMBER, ACTION.SCHEDULE_UPDATE)).toBe(false);
      expect(can(ROLE.MEMBER, ACTION.SCHEDULE_DELETE)).toBe(false);
    });

    it('can: team_member cannot process change request (BR-03/AC-08)', () => {
      expect(can(ROLE.MEMBER, ACTION.CHANGE_REQUEST_PROCESS)).toBe(false);
    });

    it('can: team_member can read schedule / chat / create change request (docs/1 §5)', () => {
      expect(can(ROLE.MEMBER, ACTION.SCHEDULE_READ)).toBe(true);
      expect(can(ROLE.MEMBER, ACTION.CHAT_WRITE)).toBe(true);
      expect(can(ROLE.MEMBER, ACTION.CHAT_READ)).toBe(true);
      expect(can(ROLE.MEMBER, ACTION.DAILY_CHAT_LOG_READ)).toBe(true);
      expect(can(ROLE.MEMBER, ACTION.CHANGE_REQUEST_CREATE)).toBe(true);
    });
  });

  describe('team_leader (팀장)', () => {
    it('can: team_leader can create/update/delete schedule (BR-03)', () => {
      expect(can(ROLE.LEADER, ACTION.SCHEDULE_CREATE)).toBe(true);
      expect(can(ROLE.LEADER, ACTION.SCHEDULE_UPDATE)).toBe(true);
      expect(can(ROLE.LEADER, ACTION.SCHEDULE_DELETE)).toBe(true);
    });

    it('can: team_leader can process change request (BR-09/AC-07)', () => {
      expect(can(ROLE.LEADER, ACTION.CHANGE_REQUEST_PROCESS)).toBe(true);
    });

    it('can: team_leader has all matrix actions (docs/1 §5)', () => {
      for (const action of Object.values(ACTION)) {
        expect(can(ROLE.LEADER, action)).toBe(true);
      }
    });
  });

  describe('unknown role / action', () => {
    it('can: unknown role denied (BR-01)', () => {
      expect(can('guest', ACTION.SCHEDULE_READ)).toBe(false);
      expect(can(undefined, ACTION.SCHEDULE_READ)).toBe(false);
    });

    it('can: unknown action denied', () => {
      expect(can(ROLE.LEADER, 'schedule:nuke')).toBe(false);
    });
  });
});
