// 상품 등록·수정 폼 (디자인 없는 화면 — 콘솔 디자인 언어로 구성, Q14 a)
// 등록: POST /api/admin/tours, 수정: PUT /api/admin/tours/{tourId}
// 수정 시 기존 옵션의 id를 반드시 포함해야 한다(BE 계약).
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { createProduct, updateProduct } from '@/api/tours';
import type { TravelOptionRequest, TravelProductResponse } from '@/api/types';
import { classicBlocked, THEMES } from '@/domain/rules';
import { GRADE_LABEL, OPTION_TYPE_LABEL } from '@/domain/status';
import { color } from '@/styles/tokens';
import { Modal, ModalFooter } from '@/components/console/Modal';
import { FieldLabel, GhostBtn, Input, Required, Select, Textarea } from '@/components/console/ui';

const GRADES = ['CLASSIC', 'GRAND', 'PREMIUM'] as const;
const TYPES = ['HOTEL', 'TRANSPORT', 'MEAL', 'EXTRA'] as const;
/** EXTRA 옵션의 혜택 종류(BE benefitCode). CHAMPAGNE은 프리미엄 기본 포함 혜택이라 프리미엄에서 선택 불가 */
const BENEFITS = [
  { code: 'OTHER', label: '일반 추가 옵션' },
  { code: 'CHAMPAGNE', label: '샴페인' },
  { code: 'COFFEE', label: '커피' },
] as const;
const DEFAULT_BENEFIT = 'OTHER';
const isChampagne = (r: OptionRow) => r.type === 'EXTRA' && r.benefitCode === 'CHAMPAGNE';

/** 종류·혜택에 맞춰 benefitCode와 샴페인 프리미엄 제한을 정리한다 */
function normalizeRow(r: OptionRow): OptionRow {
  if (r.type !== 'EXTRA') return { ...r, benefitCode: null };
  const benefitCode = r.benefitCode ?? DEFAULT_BENEFIT;
  if (benefitCode !== 'CHAMPAGNE') return { ...r, benefitCode };
  return {
    ...r,
    benefitCode,
    allowedTourGrades: r.allowedTourGrades.filter((g) => g !== 'PREMIUM'),
    defaultForGrade: r.defaultForGrade === 'PREMIUM' ? '' : r.defaultForGrade,
  };
}

interface OptionRow {
  id: number | null;
  type: string;
  name: string;
  grade: string;
  additionalPrice: string;
  description: string | null;
  defaultForGrade: string;
  allowedTourGrades: string[];
  benefitCode: string | null;
}

function emptyRow(): OptionRow {
  return { id: null, type: 'HOTEL', name: '', grade: 'CLASSIC', additionalPrice: '0', description: null, defaultForGrade: '', allowedTourGrades: [], benefitCode: null };
}

export default function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  product: TravelProductResponse | null;
  onClose: () => void;
  onSaved: (flashText: string) => void;
}) {
  const qc = useQueryClient();
  const isEdit = product !== null;

  const [name, setName] = useState(product?.name ?? '');
  const [theme, setTheme] = useState(product?.theme ?? '허니문');
  const [description, setDescription] = useState(product?.description ?? '');
  const [classicPrice, setClassicPrice] = useState(product?.classicPrice != null ? String(product.classicPrice) : '');
  const [grandPrice, setGrandPrice] = useState(product?.grandPrice != null ? String(product.grandPrice) : '');
  const [premiumPrice, setPremiumPrice] = useState(product?.premiumPrice != null ? String(product.premiumPrice) : '');
  const [options, setOptions] = useState<OptionRow[]>(
    product
      ? product.options.map((o) => ({
          id: o.id,
          type: o.type,
          name: o.name,
          grade: o.grade,
          additionalPrice: String(o.additionalPrice),
          description: o.description,
          defaultForGrade: o.defaultForGrade ?? '',
          allowedTourGrades: o.allowedTourGrades ?? [],
          benefitCode: o.type === 'EXTRA' ? (o.benefitCode ?? DEFAULT_BENEFIT) : null,
        }))
      : [emptyRow()],
  );
  const [error, setError] = useState('');

  const blocked = classicBlocked(theme);

  const setRow = (i: number, patch: Partial<OptionRow>) =>
    setOptions((rows) => rows.map((r, k) => (k === i ? normalizeRow({ ...r, ...patch }) : r)));
  const removeRow = (i: number) => setOptions((rows) => rows.filter((_, k) => k !== i));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        theme,
        description: description.trim() || null,
        classicPrice: blocked || classicPrice === '' ? null : Number(classicPrice),
        grandPrice: Number(grandPrice),
        premiumPrice: Number(premiumPrice),
        options: options.map(
          (r): TravelOptionRequest => ({
            ...(r.id != null ? { id: r.id } : {}),
            type: r.type,
            name: r.name.trim(),
            grade: r.grade,
            additionalPrice: Number(r.additionalPrice || 0),
            description: r.description,
            defaultForGrade: r.defaultForGrade || null,
            allowedTourGrades: r.allowedTourGrades.length ? r.allowedTourGrades : null,
            benefitCode: r.type === 'EXTRA' ? (r.benefitCode ?? DEFAULT_BENEFIT) : null,
          }),
        ),
      };
      return isEdit ? updateProduct(product.id, body) : createProduct(body);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['products'] });
      onSaved(isEdit ? `'${name.trim()}' 상품 정보를 저장했습니다.` : `'${name.trim()}' 상품을 등록했습니다.`);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '상품을 저장하지 못했습니다.'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('상품명을 입력해 주세요.');
    if (grandPrice === '' || premiumPrice === '') return setError('그랜드·프리미엄 가격은 필수입니다.');
    if (!blocked && classicPrice === '') return setError(`${theme} 상품은 클래식 가격도 입력해야 합니다.`);
    const prices = [classicPrice, grandPrice, premiumPrice].filter((v) => v !== '');
    if (prices.some((v) => !/^\d+$/.test(v))) return setError('가격은 0 이상의 정수로 입력해 주세요.');
    for (const r of options) {
      if (!r.name.trim()) return setError('옵션명이 비어 있는 옵션이 있습니다.');
      if (!/^\d+$/.test(r.additionalPrice || '0')) return setError('옵션 추가 금액은 0 이상의 정수로 입력해 주세요.');
      if (blocked && r.grade === 'CLASSIC') return setError(`${theme} 상품에는 클래식 등급 옵션을 등록할 수 없습니다.`);
      if (r.type === 'EXTRA' && r.benefitCode === 'CHAMPAGNE' && (r.allowedTourGrades.includes('PREMIUM') || r.defaultForGrade === 'PREMIUM'))
        return setError('샴페인 옵션은 프리미엄 기본 포함 혜택이라 프리미엄 등급에서 선택할 수 없습니다.');
    }
    setError('');
    save.mutate();
  };

  return (
    <Modal title={isEdit ? '상품 수정' : '상품 등록'} width={860} onClose={onClose}>
      <form id="product-form" onSubmit={submit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>
              상품명 <Required>(필수)</Required>
            </FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>
              테마 <Required>(필수)</Required>
            </FieldLabel>
            <Select value={theme} onChange={(e) => setTheme(e.target.value)} disabled={isEdit}>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>상품 설명</FieldLabel>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>클래식 1인 가격{!blocked && <Required> (필수)</Required>}</FieldLabel>
            <Input
              inputMode="numeric"
              value={blocked ? '' : classicPrice}
              onChange={(e) => setClassicPrice(e.target.value)}
              disabled={blocked}
              placeholder={blocked ? '판매 불가' : ''}
              style={{ textAlign: 'right' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>
              그랜드 1인 가격 <Required>(필수)</Required>
            </FieldLabel>
            <Input inputMode="numeric" value={grandPrice} onChange={(e) => setGrandPrice(e.target.value)} style={{ textAlign: 'right' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>
              프리미엄 1인 가격 <Required>(필수)</Required>
            </FieldLabel>
            <Input inputMode="numeric" value={premiumPrice} onChange={(e) => setPremiumPrice(e.target.value)} style={{ textAlign: 'right' }} />
          </label>
        </div>
        {blocked && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: color.consoleFaint }}>
            허니문·효도 상품은 그랜드 또는 프리미엄 등급만 판매할 수 있어 클래식 가격과 클래식 등급 옵션은 등록할 수 없습니다.
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <FieldLabel as="span" style={{ fontWeight: 700, color: color.consoleText }}>
            옵션 ({options.length})
          </FieldLabel>
          <GhostBtn type="button" onClick={() => setOptions((rows) => [...rows, emptyRow()])}>
            옵션 추가
          </GhostBtn>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((r, i) => (
            <div
              key={r.id ?? `new-${i}`}
              style={{ border: `1px solid ${color.consoleBorder}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 130px', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>종류</FieldLabel>
                  <Select value={r.type} onChange={(e) => setRow(i, { type: e.target.value })}>
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {OPTION_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>
                    옵션명 <Required>(필수)</Required>
                  </FieldLabel>
                  <Input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} maxLength={255} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>옵션 등급</FieldLabel>
                  <Select value={r.grade} onChange={(e) => setRow(i, { grade: e.target.value })}>
                    {GRADES.map((g) => (
                      <option key={g} value={g} disabled={blocked && g === 'CLASSIC'}>
                        {GRADE_LABEL[g]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>추가 금액(원)</FieldLabel>
                  <Input
                    inputMode="numeric"
                    value={r.additionalPrice}
                    onChange={(e) => setRow(i, { additionalPrice: e.target.value })}
                    style={{ textAlign: 'right' }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {r.type === 'EXTRA' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FieldLabel>혜택 종류</FieldLabel>
                      <Select value={r.benefitCode ?? DEFAULT_BENEFIT} onChange={(e) => setRow(i, { benefitCode: e.target.value })}>
                        {BENEFITS.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FieldLabel>기본 제공 등급</FieldLabel>
                    <Select value={r.defaultForGrade} onChange={(e) => setRow(i, { defaultForGrade: e.target.value })}>
                      <option value="">기본 아님</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g} disabled={(blocked && g === 'CLASSIC') || (isChampagne(r) && g === 'PREMIUM')}>
                          {GRADE_LABEL[g]} 기본
                        </option>
                      ))}
                    </Select>
                  </label>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FieldLabel>허용 투어 등급</FieldLabel>
                    {GRADES.map((g) => (
                      <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: color.consoleBtnText }}>
                        <input
                          type="checkbox"
                          disabled={isChampagne(r) && g === 'PREMIUM'}
                          title={isChampagne(r) && g === 'PREMIUM' ? '프리미엄은 샴페인이 기본 포함되어 선택할 수 없습니다' : undefined}
                          checked={r.allowedTourGrades.includes(g)}
                          onChange={(e) =>
                            setRow(i, {
                              allowedTourGrades: e.target.checked
                                ? [...r.allowedTourGrades, g]
                                : r.allowedTourGrades.filter((x) => x !== g),
                            })
                          }
                        />
                        {GRADE_LABEL[g]}
                      </label>
                    ))}
                  </span>
                </div>
                <GhostBtn type="button" onClick={() => removeRow(i)} disabled={isEdit && r.id != null} title={isEdit && r.id != null ? '수정 시 기존 옵션은 모두 포함해야 합니다(BE 제약)' : undefined}>
                  옵션 삭제
                </GhostBtn>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: color.consoleFaint }}>
          허용 투어 등급을 비워 두면 BE의 기본 규칙을 따릅니다. 수정 시 기존 옵션은 모두 포함해야 하므로 기존 옵션은 삭제할 수 없습니다.
        </p>

        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: color.danger }}>
            {error}
          </p>
        )}
      </form>
      <ModalFooter formId="product-form" onClose={onClose} saveText={isEdit ? '상품 저장' : '상품 등록'} busy={save.isPending} />
    </Modal>
  );
}
