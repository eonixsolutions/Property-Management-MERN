import { Response } from 'express';

/**
 * Standardized API success response wrapper.
 *
 * All successful API responses must be produced through this class so
 * the frontend can rely on a consistent { success, data, meta } envelope.
 *
 * Usage:
 *   // Simple object response
 *   ApiResponse.ok(res, property, 'Property retrieved');
 *
 *   // Paginated list response
 *   ApiResponse.paginated(res, items, { total: 42, page: 1, limit: 25 });
 *
 *   // 201 Created
 *   ApiResponse.created(res, newTenant, 'Tenant created successfully');
 */

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

export class ApiResponse {
  /**
   * 200 OK — general success with optional message.
   */
  static ok<T>(res: Response, data: T, message?: string): Response {
    const body: SuccessResponse<T> = {
      success: true,
      data,
      ...(message ? { message } : {}),
    };
    return res.status(200).json(body);
  }

  /**
   * 201 Created — resource successfully created.
   */
  static created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    const body: SuccessResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(201).json(body);
  }

  /**
   * 200 OK — paginated list response.
   * Automatically computes totalPages, hasNextPage, hasPrevPage.
   */
  static paginated<T>(
    res: Response,
    items: T[],
    pagination: { total: number; page: number; limit: number },
    message?: string,
  ): Response {
    const { total, page, limit } = pagination;
    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    const body: SuccessResponse<T[]> = {
      success: true,
      data: items,
      meta,
      ...(message ? { message } : {}),
    };
    return res.status(200).json(body);
  }

  /**
   * 204 No Content — for DELETE operations that return nothing.
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
