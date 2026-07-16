<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->string('display_name_id')->nullable()->after('display_name');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->string('display_name_id')->nullable()->after('display_name');
        });

        // Seed Indonesian display_name_id for roles
        $roleTranslations = [
            // Intentional: English loanword standard in Indonesian manufacturing (same as Helper, PPIC, Supervisor)
            'DRAFTER' => 'Drafter',
            'PURCHASING' => 'Pembelian',
            'MACHINING' => 'Operator Mesin',
            'FABRICATION' => 'Fabrikasi',
            'PRODUCTION' => 'Helper',
            'QC' => 'Inspektor QC',
            'DELIVERY' => 'Pengiriman',
            'FINANCE' => 'Keuangan',
            'STAFF' => 'Staf',
            'ASSEMBLY' => 'Perakitan',
            'SURFACE' => 'Perawatan Permukaan',
            'PPIC' => 'PPIC',
            'MAINTENANCE' => 'Perawatan',
            'SALES' => 'Penjualan',
            'SUPERVISOR' => 'Supervisor',
            'MANAGER' => 'Manajer',
            'DIRECTOR' => 'Direktur',
        ];

        foreach ($roleTranslations as $name => $displayNameId) {
            DB::table('roles')->where('name', $name)->update(['display_name_id' => $displayNameId]);
        }

        // Seed Indonesian display_name_id for posts
        $postTranslations = [
            'Design' => 'Desain',
            'Material' => 'Material',
            'Vendor' => 'Vendor',
            'CNC' => 'CNC',
            'Milling' => 'Freis',
            'Welder' => 'Las',
            'Helper' => 'Helper',
            'QC' => 'QC',
            'Delivery' => 'Pengiriman',
            'Finance' => 'Keuangan',
            'Sales' => 'Penjualan',
            'Admin' => 'Admin',
            'Manager' => 'Manajer',
            'CAD_DRAFTER' => 'Drafter CAD',
            'DESIGN_ENGINEER' => 'Insinyur Desain',
            'PRODUCT_ENGINEER' => 'Insinyur Produk',
            'MANUFACTURING_ENGINEER' => 'Insinyur Manufaktur',
            'PROCUREMENT' => 'Pengadaan',
            'LOGISTIK' => 'Logistik',
            'GUDANG' => 'Gudang',
            'INVENTORY' => 'Inventaris',
            'TURNING' => 'Bubut',
            'DRILLING' => 'Bor',
            'GRINDING' => 'Gerinda',
            'EDM' => 'EDM',
            'SLOTTING' => 'Sekrap',
            'FITTER' => 'Fitter',
            'CUTTING' => 'Potong',
            'BENDING' => 'Tekuk',
            'ROLLING' => 'Gulung',
            'ASSEMBLY' => 'Perakitan',
            'MECHANICAL_FITTER' => 'Fitter Mekanik',
            'HEAT_TREATMENT' => 'Perlakuan Panas',
            'POWDER_COATING' => 'Lapis Serbuk',
            'PAINTING' => 'Pengecatan',
            'GALVANIZING' => 'Galvanis',
            'PLATING' => 'Lapis',
            'SANDBLASTING' => 'Sandblasting',
            'QC_INSPECTOR' => 'Inspektor QC',
            'QA_ENGINEER' => 'Insinyur QA',
            'METROLOGI' => 'Metrologi',
            'DRIVER' => 'Sopir',
            'EKSPEDISI' => 'Ekspedisi',
            'KURIR' => 'Kurir',
            'ACCOUNTING' => 'Akuntansi',
            'KASIR' => 'Kasir',
            'BILLING' => 'Penagihan',
            'CUSTOMER_SERVICE' => 'Layanan Pelanggan',
            'SUPERVISOR' => 'Supervisor',
            'FOREMAN' => 'Mandor',
            'DIRECTOR' => 'Direktur',
            'PPIC' => 'PPIC',
            'MAINTENANCE' => 'Perawatan',
        ];

        foreach ($postTranslations as $name => $displayNameId) {
            DB::table('posts')->where('name', $name)->update(['display_name_id' => $displayNameId]);
        }
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('display_name_id');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('display_name_id');
        });
    }
};
