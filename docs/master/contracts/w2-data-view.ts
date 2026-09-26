import {
  canContinueCollection,
  type CollectionSection,
} from './w2-collection-envelope.ts'
import { isSafeOpaqueReference } from './w2-runtime-validation.ts'

export type DataCell = string | number | boolean | null

export type DataViewColumn = Readonly<{
  id: string
  label: string
  isRowHeader: boolean
  critical: boolean
}>

export type DataViewRow = Readonly<{
  rowKey: string
  cells: Readonly<Record<string, DataCell>>
}>

export type PaginationPresentation =
  | { state: 'complete' }
  | { state: 'more_available'; continuation: string; actionLabel: 'Cargar más' }
  | { state: 'incomplete_no_action' }
  | { state: 'continuation_expired' }
  | { state: 'unavailable' }

export type DataViewModel = Readonly<{
  accessibleLabel: string
  caption: string
  columns: readonly DataViewColumn[]
  rows: readonly DataViewRow[]
  rowHeaderColumnId: string
  presentation: 'semantic_table' | 'labelled_cards'
  horizontalScrollRegion:
    | null
    | Readonly<{ role: 'region'; label: string; keyboardFocusable: true }>
  pagination: PaginationPresentation
}>

export type CreateDataViewInput = Readonly<{
  accessibleLabel: string
  caption: string
  columns: readonly DataViewColumn[]
  section: CollectionSection<DataViewRow>
  viewport: 'compact' | 'wide'
  wideOverflow: boolean
}>

export type CreateDataViewResult =
  | { ok: true; model: DataViewModel }
  | { ok: false; reason: 'invalid_structure' | 'duplicate_row_key' }

const paginationFor = (
  section: CollectionSection<DataViewRow>,
): PaginationPresentation => {
  if (
    section.state === 'not_authorized' ||
    section.state === 'error' ||
    section.state === 'unsupported' ||
    section.state === 'unavailable'
  ) {
    return { state: 'unavailable' }
  }
  if (section.state === 'stale') {
    return section.completeness.kind === 'partial'
      ? { state: 'continuation_expired' }
      : { state: 'complete' }
  }
  if (section.state === 'partial') {
    return canContinueCollection(section)
      ? {
          state: 'more_available',
          continuation: section.nextCursor,
          actionLabel: 'Cargar más',
        }
      : { state: 'incomplete_no_action' }
  }
  return { state: 'complete' }
}

export function createDataView(
  input: CreateDataViewInput,
): CreateDataViewResult {
  if (
    !input.accessibleLabel.trim() ||
    input.accessibleLabel.length > 160 ||
    !input.caption.trim() ||
    input.caption.length > 240 ||
    input.columns.length === 0 ||
    input.columns.length > 20
  ) {
    return { ok: false, reason: 'invalid_structure' }
  }
  const columnIds = input.columns.map(({ id }) => id)
  const rowHeaders = input.columns.filter(({ isRowHeader }) => isRowHeader)
  if (
    new Set(columnIds).size !== columnIds.length ||
    !input.columns.every(
      ({ id, label }) =>
        isSafeOpaqueReference(id) &&
        label.trim().length > 0 &&
        label.length <= 120,
    ) ||
    rowHeaders.length !== 1
  ) {
    return { ok: false, reason: 'invalid_structure' }
  }

  const rows =
    input.section.data === null ? [] : [...input.section.data]
  const rowKeys = rows.map(({ rowKey }) => rowKey)
  if (new Set(rowKeys).size !== rowKeys.length) {
    return { ok: false, reason: 'duplicate_row_key' }
  }
  for (const row of rows) {
    if (
      !isSafeOpaqueReference(row.rowKey) ||
      Object.keys(row.cells).some((key) => !columnIds.includes(key)) ||
      columnIds.some((key) => !Object.prototype.hasOwnProperty.call(row.cells, key)) ||
      row.cells[rowHeaders[0].id] === null
    ) {
      return { ok: false, reason: 'invalid_structure' }
    }
  }

  const semanticTable = input.viewport === 'wide'
  return {
    ok: true,
    model: Object.freeze({
      accessibleLabel: input.accessibleLabel,
      caption: input.caption,
      columns: Object.freeze(input.columns.map((column) => Object.freeze({ ...column }))),
      rows: Object.freeze(
        rows.map((row) =>
          Object.freeze({ rowKey: row.rowKey, cells: Object.freeze({ ...row.cells }) }),
        ),
      ),
      rowHeaderColumnId: rowHeaders[0].id,
      presentation: semanticTable ? 'semantic_table' : 'labelled_cards',
      horizontalScrollRegion:
        semanticTable && input.wideOverflow
          ? Object.freeze({
              role: 'region' as const,
              label: `${input.accessibleLabel}: desplazamiento horizontal`,
              keyboardFocusable: true as const,
            })
          : null,
      pagination: Object.freeze(paginationFor(input.section)),
    }),
  }
}

export type LabelledCard = Readonly<{
  rowKey: string
  rowHeader: DataCell
  fields: readonly Readonly<{
    columnId: string
    label: string
    value: DataCell
    critical: boolean
  }>[]
}>

/** Mobile cards preserve every header/value association from the table. */
export function toLabelledCards(model: DataViewModel): readonly LabelledCard[] {
  return model.rows.map((row) =>
    Object.freeze({
      rowKey: row.rowKey,
      rowHeader: row.cells[model.rowHeaderColumnId],
      fields: Object.freeze(
        model.columns.map((column) =>
          Object.freeze({
            columnId: column.id,
            label: column.label,
            value: row.cells[column.id],
            critical: column.critical,
          }),
        ),
      ),
    }),
  )
}

