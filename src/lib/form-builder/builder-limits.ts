export const MAX_DROPDOWN_OPTIONS = 50
export const MAX_DATA_TABLE_COLUMNS = 8
export const MAX_DATA_TABLE_ROWS = 25

export function clampToDataTableRowLimit(value: number) {
  return Math.min(Math.max(value, 0), MAX_DATA_TABLE_ROWS)
}
