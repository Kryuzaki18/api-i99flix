/**
 * Pagination helpers shared across routes.
 */

export interface PaginationParams {
  page:  number;
  limit: number;
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

/** Parse and clamp page/limit from raw query params */
export function parsePagination(
  rawPage:  unknown,
  rawLimit: unknown,
  maxLimit = 100,
): PaginationParams {
  const page  = Math.max(1, parseInt(String(rawPage  ?? 1),  10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(rawLimit ?? 20), 10) || 20));
  return { page, limit };
}

/** Build a paginated result envelope */
export function paginate<T>(
  data:  T[],
  total: number,
  { page, limit }: PaginationParams,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
