/**
 * API Response Helpers
 * Standardized response formatting for consistent API
 */

/**
 * Send success response
 */
export function success(res, data, message = null, meta = null) {
  const response = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };
  
  return res.status(200).json(response);
}

/**
 * Send created response (201)
 */
export function created(res, data = null, message = 'Resource created successfully') {
  const response = {
    success: true,
    message,
    ...(data && { data }),
  };
  
  return res.status(201).json(response);
}

/**
 * Send no content response (204)
 */
export function noContent(res) {
  return res.status(204).send();
}

/**
 * Send paginated response
 */
export function paginated(res, data, pagination) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    },
  });
}

/**
 * Build pagination object from query params
 */
export function buildPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Extract pagination metadata from database result
 */
export function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
