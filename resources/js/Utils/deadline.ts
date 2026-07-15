export const calculateDeadlineDiff = (deadlineDateStr: string | undefined): { diffDays: number; formattedDate: string } => {
    if (!deadlineDateStr) return { diffDays: 0, formattedDate: '' };
    
    const deadline = new Date(deadlineDateStr);
    const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const today = new Date();
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = deadlineClean.getTime() - todayClean.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formattedDate = deadlineClean.toLocaleDateString();

    return { diffDays, formattedDate };
};

export const formatDeadline = (deadlineDateStr: string | undefined, lang: 'en' | 'id'): string => {
    if (!deadlineDateStr) return '';
    const { diffDays, formattedDate } = calculateDeadlineDiff(deadlineDateStr);

    if (diffDays === 0) {
        return lang === 'id' ? `${formattedDate} (Hari Ini)` : `${formattedDate} (Today)`;
    } else if (diffDays > 0) {
        if (diffDays === 7) return lang === 'id' ? `${formattedDate} (1 minggu)` : `${formattedDate} (1 week)`;
        if (diffDays === 30) return lang === 'id' ? `${formattedDate} (1 bulan)` : `${formattedDate} (1 month)`;
        return lang === 'id' ? `${formattedDate} (${diffDays} hari)` : `${formattedDate} (${diffDays} days)`;
    } else {
        return lang === 'id' ? `${formattedDate} (terlambat ${Math.abs(diffDays)} hari)` : `${formattedDate} (delayed ${Math.abs(diffDays)} days)`;
    }
};
