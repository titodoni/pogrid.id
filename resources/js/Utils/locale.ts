export type Language = 'en' | 'id';

interface LocalizedItem {
    display_name: string;
    display_name_id?: string | null;
}

export function getLanguage(): Language {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('pogrid_lang') as Language) || 'id';
    }
    return 'en';
}

export function setLanguage(lang: Language): void {
    localStorage.setItem('pogrid_lang', lang);
}

export function localizedDisplay(item: LocalizedItem | undefined | null, lang: Language): string {
    if (!item) return '';
    if (lang === 'id' && item.display_name_id) return item.display_name_id;
    return item.display_name;
}

const STATUS_TRANSLATIONS: Record<string, { en: string; id: string }> = {
    COMPLETED: { en: 'Completed', id: 'Selesai Diproduksi' },
    IN_PRODUCTION: { en: 'In Production', id: 'Sedang Produksi' },
    IN_PROGRESS: { en: 'In Progress', id: 'Sedang Diproses' },
    CANCELLED: { en: 'Cancelled', id: 'Dibatalkan' },
    TERMINATED: { en: 'Terminated', id: 'Dihentikan Owner' },
    PENDING: { en: 'Pending', id: 'Menunggu Antrian' },
    DELIVERED: { en: 'Delivered', id: 'Terkirim' },
    CLOSED: { en: 'Closed', id: 'Ditutup' },
    URGENT: { en: 'Urgent', id: 'Prioritas Tinggi' },
    MANUFACTURED: { en: 'Manufactured', id: 'Produksi Sendiri' },
    MANUFACTURE: { en: 'Manufacture', id: 'Produksi Sendiri' },
    BUYOUT: { en: 'Buy-Out', id: 'Pembelian Luar' },
    BUY_OUT: { en: 'Buy-Out', id: 'Pembelian Luar' },
    DRAWING: { en: 'Drawing', id: 'Desain Gambar' },
    APPROVED: { en: 'Approved', id: 'Disetujui' },
    ORDER: { en: 'Order', id: 'Pemesanan' },
    PROSES: { en: 'Processing', id: 'Sedang Diposes' },
    READY: { en: 'Ready', id: 'Siap Kirim' },
    UNINVOICED: { en: 'Uninvoiced', id: 'Belum Ditagih' },
    PARTIAL: { en: 'Partial', id: 'Sebagian' },
    INVOICED: { en: 'Invoiced', id: 'Sudah Ditagih' },
    UNPAID: { en: 'Unpaid', id: 'Belum Dibayar' },
    PARTIAL_PAID: { en: 'Partial Paid', id: 'Terbayar Sebagian' },
    PAID: { en: 'Paid', id: 'Lunas' },
    STUCK: { en: 'Stuck / Bottleneck', id: 'Kendala Operasional' },
    ACTIVE: { en: 'Active', id: 'Aktif' },
    INACTIVE: { en: 'Inactive', id: 'Non-Aktif' },
};

export function translateStatus(status: string, lang?: Language): string {
    if (!status) return '';
    const activeLang = lang || getLanguage();
    const key = status.toUpperCase().replace(/\s+/g, '_');
    const entry = STATUS_TRANSLATIONS[key];
    if (entry) {
        return entry[activeLang];
    }
    return status;
}
