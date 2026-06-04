/** Daily Chat Log 조회/작성 (FE-09, FR-07 / BR-05) — selectedDate(targetDate) 기준. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as chatApi from '../../api/endpoints/chat';

export function chatQueryKey(teamId: string | null, date: string) {
  return ['chat', teamId, date] as const;
}

export function useDailyChatLog(teamId: string | null, date: string) {
  return useQuery({
    queryKey: chatQueryKey(teamId, date),
    queryFn: () => chatApi.listChat(teamId as string, date),
    enabled: Boolean(teamId && date),
  });
}

export function usePostMessage(teamId: string, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // 전송 시 selectedDate 를 targetDate 로 부여(도메인 §4.1).
    mutationFn: (content: string) => chatApi.postChat(teamId, { content, targetDate: date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatQueryKey(teamId, date) }),
  });
}
