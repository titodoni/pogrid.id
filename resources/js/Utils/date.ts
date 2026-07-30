/**
 * Universal date formatter to enforce strict dd/mm/yyyy formatting across the application.
 */
export function formatDDMMYYYY(input: string | Date | null | undefined): string {
    if (!input) return '-';
    try {
        const d = typeof input === 'string' ? new Date(input) : input;
        if (isNaN(d.getTime())) return typeof input === 'string' ? input : '-';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}/${month}/${year}`;
    } catch {
        return typeof input === 'string' ? input : '-';
    }
}

/**
 * Universal date-time formatter to enforce standard dd/mm/yyyy, hh:mm format.
 */
export function formatDateTimeDDMMYYYY(input: string | Date | null | undefined): string {
    if (!input) return '-';
    try {
        const d = typeof input === 'string' ? new Date(input) : input;
        if (isNaN(d.getTime())) return typeof input === 'string' ? input : '-';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch {
        return typeof input === 'string' ? input : '-';
    }
}
