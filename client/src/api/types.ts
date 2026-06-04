/**
 * API 요청/응답 타입 (FE-02) — swagger/swagger.json 계약 기준, 전부 camelCase.
 */

export type Role = 'team_leader' | 'team_member';
export type ChangeRequestStatus = 'requested' | 'applied' | 'rejected';

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupRequest {
  email: string;
  displayName: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWithRole extends Team {
  role: Role;
}

export interface Membership {
  id: string;
  userId: string;
  teamId: string;
  role: Role;
  joinedAt: string;
}

export interface Schedule {
  id: string;
  teamId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictInfo {
  scheduleId: string;
  title: string;
  startAt: string;
  endAt: string;
}

export interface ScheduleResponse {
  schedule: Schedule;
  conflicts: ConflictInfo[];
}

export interface CreateScheduleRequest {
  title: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
}

export type UpdateScheduleRequest = Partial<CreateScheduleRequest>;

export interface ChatMessage {
  id: string;
  teamId: string;
  senderId: string;
  content: string;
  targetDate: string;
  createdAt: string;
}

export interface CreateChatMessageRequest {
  content: string;
  targetDate?: string;
}

export interface ScheduleChangeRequest {
  id: string;
  teamId: string;
  scheduleId: string;
  requesterId: string;
  status: ChangeRequestStatus;
  requestContent: string;
  originMessageId: string;
  processedBy: string | null;
  processedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
}

export interface CreateChangeRequestRequest {
  scheduleId: string;
  requestContent: string;
  originMessageId?: string;
  content?: string;
}

export interface ProcessChangeRequestRequest {
  action: 'applied' | 'rejected';
  scheduleUpdate?: UpdateScheduleRequest;
  rejectReason?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  relatedEvent: string;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

/** 서버 표준 에러 본문 형식. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}
