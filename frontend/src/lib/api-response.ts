export class ApiContractError extends Error {
  constructor(
    public readonly context: string,
    details: string,
    public readonly raw?: DynamicValue,
  ) {
    super(`API Contract Error [${context}]: ${details}`)
    this.name = 'ApiContractError'
  }
}

function typedValue<T>(value: DynamicValue): T {
  return JSON.parse(JSON.stringify(value))
}

export function parseTyped<T>(value: DynamicValue): T {
  return typedValue<T>(value)
}

export function parsePg<T>(
  input: DynamicValue,
  context: string,
): { items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
  if (!input || typeof input !== 'object') {
    throw new ApiContractError(context, `Expected object, got ${typeof input}`, input)
  }
  const obj: DynamicRecord = Object.fromEntries(Object.entries(input))
  if (!Array.isArray(obj.items)) {
    throw new ApiContractError(context, `Expected 'items' to be an array, got ${typeof obj.items}`, input)
  }
  const paginationValue = obj.pagination
  if (!paginationValue || typeof paginationValue !== 'object' || Array.isArray(paginationValue)) {
    throw new ApiContractError(context, `Expected 'pagination' to be an object, got ${typeof obj.pagination}`, input)
  }
  const p: DynamicRecord = Object.fromEntries(Object.entries(paginationValue))
  return {
    items: obj.items.map((item) => typedValue<T>(item)),
    pagination: {
      page: Number(p.page) || 1,
      limit: Number(p.limit) || 10,
      total: Number(p.total) || 0,
      totalPages: Number(p.totalPages) || 0,
    },
  }
}

export function parseArr<T>(
  input: DynamicValue,
  context: string,
): T[] {
  if (Array.isArray(input)) {
    return input.map((item) => typedValue<T>(item))
  }
  if (input && typeof input === 'object') {
    const obj: DynamicRecord = Object.fromEntries(Object.entries(input))
    if (Array.isArray(obj.items)) {
      return obj.items.map((item) => typedValue<T>(item))
    }
  }
  throw new ApiContractError(context, `Expected array, got ${typeof input}`, input)
}

export function parseObj<T extends DynamicRecord>(
  input: DynamicValue,
  context: string,
): T {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiContractError(context, `Expected object, got ${typeof input}`, input)
  }
  return typedValue<T>(input)
}
