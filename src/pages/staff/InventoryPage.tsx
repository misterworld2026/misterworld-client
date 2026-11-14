// 직원 · 물품·재고 관리 — 디자인 캔버스 Inventory.dc.html을 실제 API로 구현.
// 데이터: GET /api/admin/inventory, GET /api/tours (상품→테마), POST /api/admin/inventory, PATCH /api/admin/inventory/{id}
// Q2: 재고 부족 = 4개 이하 (BE 기준값 변경 요청 1). 목록 상태는 BE status 값을 그대로 따른다.
// Q3·Q4: '공통' 없음. 물품은 반드시 상품에 연결하며, 등록 폼은 "테마 · 상품명"으로 고른다.
import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { fetchProducts } from '@/api/tours';
import { createInventory, fetchInventory, updateInventoryQuantity } from '@/api/inventory';
import type { InventoryResponse, TravelProductResponse } from '@/api/types';
import { THEMES } from '@/domain/rules';
import { dateTimeKst } from '@/domain/format';
import { color } from '@/styles/tokens';
import ConsoleLayout, { type Flash } from '@/components/console/ConsoleLayout';
import { Modal } from '@/components/console/Modal';
import {
  Chip, ChipDivider, ChipGroup, Cut, EmptyNote, FieldLabel, FootNote, GhostBtn, Input, Panel, PanelTitle, PrimaryBtn,
  RangeText, RefreshBox, Required, Row, Select, Table, TableScroll,
} from '@/components/console/ui';

/** 화면 안내 기준 (Q2 확정: 4개 이하) */
const LOW = 4;
const isLowStatus = (it: InventoryResponse) => it.status !== 'NORMAL';

type ModalState = { kind: 'new' } | { kind: 'edit'; item: InventoryResponse };

export default function InventoryPage() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [theme, setTheme] = useState<string>('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<ModalState | null>(null);

  const items = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

  const productById = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const themeOf = (it: InventoryResponse) => productById.get(it.productId)?.theme ?? '-';

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['inventory'] });
    await qc.invalidateQueries({ queryKey: ['products'] });
    setFlash({ text: '물품 목록을 다시 불러왔습니다.', kind: 'ok' });
  };

  const query = q.trim();
  const visible = (items.data ?? [])
    .filter((it) => (theme === 'all' || themeOf(it) === theme) && (!lowOnly || isLowStatus(it)) && (!query || it.itemName.includes(query)))
    .sort((a, b) => a.itemName.localeCompare(b.itemName, 'ko'));

  const chips = [{ id: 'all', name: '전체' }, ...THEMES.map((t) => ({ id: t, name: t }))];
  const ringColor = lowOnly ? color.consoleSelected : color.consoleFaint;

  return (
    <ConsoleLayout
      title="물품·재고 관리"
      description={`여행에 쓰는 물품을 등록하고 재고 수량을 수정합니다. 재고가 ${LOW}개 이하인 물품은 재고 부족으로 표시됩니다.`}
      flash={flash}
      onClearFlash={() => setFlash(null)}
    >
      <Panel aria-labelledby="items-h">
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${color.consoleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <PanelTitle id="items-h">
            물품 <span>({items.data?.length ?? 0})</span>
          </PanelTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshBox onClick={refresh} />
            <PrimaryBtn type="button" onClick={() => setModal({ kind: 'new' })}>
              물품 등록
            </PrimaryBtn>
          </div>
        </div>

        <div style={{ padding: '10px 20px 10px 8px', borderBottom: `1px solid ${color.consoleBorder}`, display: 'grid', gridTemplateColumns: 'auto 300px 1fr', alignItems: 'center', columnGap: 16 }}>
          <ChipGroup role="group" aria-label="테마 필터">
            {chips.map((c, i) => (
              <Fragment key={c.id}>
                {i > 0 && <ChipDivider />}
                <Chip type="button" $on={theme === c.id} aria-pressed={theme === c.id} onClick={() => setTheme(c.id)}>
                  {c.name}
                </Chip>
              </Fragment>
            ))}
            <ChipDivider />
            <Chip
              type="button"
              role="radio"
              aria-checked={lowOnly}
              $on={lowOnly}
              onClick={() => setLowOnly((v) => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <span aria-hidden="true" style={{ width: 16, height: 16, boxSizing: 'border-box', border: `1.5px solid ${ringColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: lowOnly ? color.consoleSelected : 'transparent', display: 'block' }} />
              </span>
              재고 부족
            </Chip>
          </ChipGroup>
          <label style={{ position: 'relative', display: 'block' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: color.consoleDim, display: 'flex' }}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" />
              </svg>
            </span>
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="물품명으로 검색" aria-label="물품명으로 검색" style={{ width: '100%', paddingLeft: 32 }} />
          </label>
          <RangeText>{visible.length ? `총 ${visible.length}개` : '표시할 물품 없음'}</RangeText>
        </div>

        <TableScroll>
          <Table $minWidth={960}>
            <thead>
              <tr>
                <th scope="col" aria-sort="ascending">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: color.consoleText }}>
                    물품명
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 6.5 5 3.5l3 3" />
                    </svg>
                  </span>
                </th>
                <th scope="col" style={{ width: 120 }}>관련 테마</th>
                <th scope="col" style={{ width: 120, textAlign: 'right' }}>재고 수량</th>
                <th scope="col" style={{ width: 140 }}>재고 상태</th>
                <th scope="col" style={{ width: 170 }}>최근 수정</th>
                <th scope="col" style={{ width: 128, textAlign: 'right' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((it) => {
                const low = isLowStatus(it);
                return (
                  <Row key={it.id}>
                    <td style={{ padding: '10px 12px 10px 20px' }}><Cut title={it.itemName}>{it.itemName}</Cut></td>
                    <td style={{ padding: '10px 12px', color: color.consoleChip }}><Cut>{themeOf(it)}</Cut></td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', color: low ? color.danger : color.consoleText }}>{it.quantity}개</td>
                    <td style={{ padding: '10px 12px' }}><Cut style={{ color: low ? color.danger : color.consoleDim }}>{low ? '재고 부족' : '정상'}</Cut></td>
                    <td style={{ padding: '10px 12px', color: color.consoleDim }}><Cut>{dateTimeKst(it.updatedAt)}</Cut></td>
                    <td style={{ padding: '6px 20px 6px 12px', textAlign: 'right' }}>
                      <GhostBtn type="button" aria-label={`${it.itemName} 수량 수정`} onClick={() => setModal({ kind: 'edit', item: it })} style={{ height: 28, padding: '0 10px', fontSize: 13 }}>
                        수량 수정
                      </GhostBtn>
                    </td>
                  </Row>
                );
              })}
            </tbody>
          </Table>
        </TableScroll>
        {items.isLoading && <EmptyNote>물품 목록을 불러오는 중입니다…</EmptyNote>}
        {items.error != null && (
          <EmptyNote role="alert">
            {items.error instanceof ApiError ? items.error.message : '물품 목록을 불러오지 못했습니다. 새로고침을 눌러 다시 시도해 주세요.'}
          </EmptyNote>
        )}
        {!items.isLoading && !items.error && visible.length === 0 && (
          <EmptyNote>조건에 맞는 물품이 없습니다. 검색어나 필터를 바꿔 보세요.</EmptyNote>
        )}
        <FootNote>재고 수량은 0 이상의 정수만 저장됩니다. {LOW}개 이하로 저장해도 저장은 되며, 목록에 재고 부족으로 표시됩니다.</FootNote>
      </Panel>

      {modal && (
        <InventoryModal
          modal={modal}
          products={products.data ?? []}
          onClose={() => setModal(null)}
          onSaved={(text, low) => {
            setModal(null);
            setFlash({ text, kind: low ? 'error' : 'ok' });
          }}
        />
      )}
    </ConsoleLayout>
  );
}

function InventoryModal({
  modal,
  products,
  onClose,
  onSaved,
}: {
  modal: ModalState;
  products: TravelProductResponse[];
  onClose: () => void;
  onSaved: (text: string, low: boolean) => void;
}) {
  const qc = useQueryClient();
  const isNew = modal.kind === 'new';
  const editing = modal.kind === 'edit' ? modal.item : null;
  const [name, setName] = useState('');
  const [productId, setProductId] = useState<string>('');
  const [qty, setQty] = useState(editing ? String(editing.quantity) : '');
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState('');

  const sortedProducts = [...products].sort(
    (a, b) => THEMES.indexOf(a.theme as never) - THEMES.indexOf(b.theme as never) || a.name.localeCompare(b.name, 'ko'),
  );

  const qtyText = qty.trim();
  const nameErr = isNew && !name.trim() ? '물품명을 입력하세요.' : '';
  const productErr = isNew && !productId ? '상품을 고르세요.' : '';
  const qtyErr = qtyText === '' ? '재고 수량을 입력하세요.' : !/^\d+$/.test(qtyText) ? '재고 수량은 0 이상의 정수로 입력하세요.' : '';
  const qtyNum = qtyErr ? null : parseInt(qtyText, 10);
  const showQtyErr = tried && !!qtyErr;
  const qtyMsg = showQtyErr ? qtyErr : qtyNum !== null && qtyNum <= LOW ? `${LOW}개 이하라 재고 부족으로 표시됩니다. 저장은 할 수 있습니다.` : '';

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? createInventory({ productId: Number(productId), itemName: name.trim(), quantity: qtyNum as number })
        : updateInventoryQuantity((editing as InventoryResponse).id, qtyNum as number),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['inventory'] });
      const low = res.status !== 'NORMAL';
      const lowNote = low ? ' 재고 부족 물품으로 표시됩니다.' : '';
      onSaved(isNew ? `${res.itemName} 물품을 등록했습니다.${lowNote}` : `${res.itemName} 재고를 ${res.quantity}개로 저장했습니다.${lowNote}`, low);
    },
    onError: (e) => setServerError(e instanceof ApiError ? e.message : '물품을 저장하지 못했습니다.'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    setServerError('');
    if (nameErr || productErr || qtyErr) return;
    save.mutate();
  };

  const errText = (msg: string) => (
    <span style={{ height: 16, fontSize: 12, lineHeight: '16px', color: color.danger }}>{tried ? msg : ''}</span>
  );

  return (
    <Modal title={isNew ? '물품 등록' : '재고 수량 수정'} onClose={onClose}>
      <form id="inventory-form" onSubmit={submit} noValidate style={{ padding: '16px 20px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {isNew && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>
                물품명 <Required>(필수)</Required>
              </FieldLabel>
              <Input
                type="text"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={tried && !!nameErr}
                style={{ borderColor: tried && nameErr ? color.danger : undefined }}
              />
              {errText(nameErr)}
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>
                관련 상품 <Required>(필수)</Required>
              </FieldLabel>
              <Select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                aria-invalid={tried && !!productErr}
                style={{ cursor: 'pointer', borderColor: tried && productErr ? color.danger : undefined }}
              >
                <option value="">상품 선택</option>
                {sortedProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.theme} · {p.name}
                  </option>
                ))}
              </Select>
              {errText(productErr)}
            </label>
          </>
        )}

        {editing && (
          <dl style={{ margin: '0 0 12px', display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', rowGap: 8 }}>
            <dt style={{ color: color.consoleDim }}>물품명</dt>
            <dd style={{ margin: 0 }}><Cut title={editing.itemName}>{editing.itemName}</Cut></dd>
            <dt style={{ color: color.consoleDim }}>현재 수량</dt>
            <dd style={{ margin: 0, color: isLowStatus(editing) ? color.danger : color.consoleText }}>
              {editing.quantity}개, {isLowStatus(editing) ? '재고 부족' : '정상'}
            </dd>
          </dl>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>
            {isNew ? '재고 수량' : '새 수량'} <Required>(필수)</Required>
          </FieldLabel>
          <span style={{ display: 'grid', gridTemplateColumns: '140px auto', alignItems: 'center', columnGap: 8 }}>
            <Input
              type="text"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              aria-invalid={showQtyErr}
              style={{ textAlign: 'right', borderColor: showQtyErr ? color.danger : undefined }}
            />
            <span style={{ color: color.consoleDim }}>개</span>
          </span>
          <span style={{ minHeight: 16, fontSize: 12, lineHeight: '16px', color: qtyMsg ? color.danger : color.consoleDim }}>{qtyMsg}</span>
        </label>
        {serverError && (
          <p role="alert" style={{ margin: '4px 0 0', fontSize: 13, color: color.danger }}>
            {serverError}
          </p>
        )}
      </form>
      <div style={{ padding: '8px 20px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <GhostBtn type="button" onClick={onClose} disabled={save.isPending}>
          닫기
        </GhostBtn>
        <PrimaryBtn type="submit" form="inventory-form" disabled={save.isPending}>
          {save.isPending ? '저장 중…' : isNew ? '물품 등록' : '수량 저장'}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
