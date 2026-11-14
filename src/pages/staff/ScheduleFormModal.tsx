// 일정 등록·수정 폼 (디자인 없는 화면 — 콘솔 디자인 언어로 구성, Q14 a)
// 등록: POST /api/admin/tours/{tourId}/schedules, 수정: PATCH /api/admin/schedules/{scheduleId}
// 요청 본문은 departureDate/endDate, 응답의 종료일 필드는 arrivalDate (BE 계약 그대로).
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { createSchedule, updateSchedule } from '@/api/schedules';
import type { TravelScheduleResponse } from '@/api/types';
import { md } from '@/domain/format';
import { color } from '@/styles/tokens';
import { Modal, ModalFooter } from '@/components/console/Modal';
import { FieldLabel, Input, Required } from '@/components/console/ui';

export default function ScheduleFormModal({
  productId,
  productName,
  schedule,
  onClose,
  onSaved,
}: {
  productId: number;
  productName: string;
  schedule: TravelScheduleResponse | null;
  onClose: () => void;
  onSaved: (flashText: string) => void;
}) {
  const qc = useQueryClient();
  const isEdit = schedule !== null;
  const [departureDate, setDepartureDate] = useState(schedule?.departureDate ?? '');
  const [endDate, setEndDate] = useState(schedule?.arrivalDate ?? '');
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? updateSchedule(schedule.travelScheduleId, { departureDate, endDate })
        : createSchedule(productId, { departureDate, endDate }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['schedules'] });
      onSaved(isEdit ? `${md(departureDate)} 출발 일정을 수정했습니다.` : `${md(departureDate)} 출발 일정을 등록했습니다.`);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '일정을 저장하지 못했습니다.'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureDate || !endDate) return setError('출발일과 종료일을 모두 입력해 주세요.');
    if (endDate < departureDate) return setError('종료일은 출발일보다 빠를 수 없습니다.');
    setError('');
    save.mutate();
  };

  return (
    <Modal title={isEdit ? '일정 수정' : '일정 등록'} onClose={onClose}>
      <form id="schedule-form" onSubmit={submit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, color: color.consoleDim, fontSize: 13 }}>{productName}</p>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>
            출발일 <Required>(필수)</Required>
          </FieldLabel>
          <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>
            종료일 <Required>(필수)</Required>
          </FieldLabel>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        {isEdit && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: color.consoleFaint }}>
            날짜만 수정할 수 있습니다. 진행·완료 일정은 수정할 수 없습니다.
          </p>
        )}
        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: color.danger }}>
            {error}
          </p>
        )}
      </form>
      <ModalFooter formId="schedule-form" onClose={onClose} saveText={isEdit ? '일정 수정' : '일정 등록'} busy={save.isPending} />
    </Modal>
  );
}
