import { router } from '@inertiajs/react';
import { Pagination } from '@astryxdesign/core';
import type { Paginated } from '@/types';

interface ServerPaginationProps<T> {
    meta: Paginated<T>;
    /** Extra query params to preserve across page navigation (e.g. filters). */
    params?: Record<string, string | number | undefined | null>;
}

export default function ServerPagination<T>({
    meta,
    params = {},
}: ServerPaginationProps<T>) {
    if (meta.last_page <= 1) {
        return null;
    }

    const go = (page: number) => {
        router.get(
            window.location.pathname,
            { ...params, page },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <Pagination
            page={meta.current_page}
            onChange={go}
            totalPages={meta.last_page}
            totalItems={meta.total}
            pageSize={meta.per_page}
        />
    );
}
