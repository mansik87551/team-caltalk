/** 채팅 엔드포인트 (FE-02) */
import { apiClient } from '../client';
import type { ChatMessage, CreateChatMessageRequest } from '../types';

export async function listChat(teamId: string, date: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<ChatMessage[]>(`/api/teams/${teamId}/chat`, {
    params: { date },
  });
  return data;
}

export async function postChat(
  teamId: string,
  body: CreateChatMessageRequest
): Promise<ChatMessage> {
  const { data } = await apiClient.post<ChatMessage>(`/api/teams/${teamId}/chat`, body);
  return data;
}
