import { sh } from '@/styles/shared';

interface Props {
  meta: {
    page: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
  onPageChange: (page: number) => void;
}

/**
 * Shared pagination control used by all list pages.
 * Renders nothing when there is only one page.
 */
export function Pagination({ meta, onPageChange }: Props) {
  if (meta.totalPages <= 1) return null;

  return (
    <div style={sh.pagination}>
      <button
        style={{ ...sh.pageBtn, ...(meta.hasPrevPage ? {} : sh.pageBtnDisabled) }}
        disabled={!meta.hasPrevPage}
        type="button"
        onClick={() => onPageChange(meta.page - 1)}
      >
        ← Prev
      </button>
      <span style={sh.pageInfo}>
        Page {meta.page} of {meta.totalPages}
      </span>
      <button
        style={{ ...sh.pageBtn, ...(meta.hasNextPage ? {} : sh.pageBtnDisabled) }}
        disabled={!meta.hasNextPage}
        type="button"
        onClick={() => onPageChange(meta.page + 1)}
      >
        Next →
      </button>
    </div>
  );
}
