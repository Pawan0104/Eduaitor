export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 200;

export const parsePagination = (
  query = {},
  { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {},
) => {
  const wantsAll =
    query.limit === "all" ||
    query.all === "true" ||
    query.all === true ||
    query.paginate === "false";

  if (wantsAll) {
    return { paginate: false, page: 1, limit: 0, skip: 0 };
  }

  const parsedPage = Number.parseInt(query.page, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedLimit = Number.parseInt(query.limit, 10);
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : defaultLimit;
  const limit = Math.min(safeLimit, maxLimit);

  return {
    paginate: true,
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const buildPaginationMeta = ({ page, limit, total }) => {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const applyPagination = (query, { page, limit, skip, paginate }) => {
  if (!paginate) return query.limit(0);
  return query.skip(skip).limit(limit);
};

export const sendPaginated = (res, { items, total, page, limit }) => ({
  success: true,
  data: items,
  pagination: buildPaginationMeta({ page, limit, total }),
});
