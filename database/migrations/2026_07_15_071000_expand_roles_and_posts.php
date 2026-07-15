<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Insert new roles (skip if name already exists)
        $newRoles = [
            ['name' => 'ASSEMBLY', 'display_name' => 'Assembly', 'level' => 'production'],
            ['name' => 'SURFACE', 'display_name' => 'Surface Treatment', 'level' => 'production'],
            ['name' => 'PPIC', 'display_name' => 'PPIC', 'level' => 'production'],
            ['name' => 'MAINTENANCE', 'display_name' => 'Maintenance', 'level' => 'production'],
            ['name' => 'SALES', 'display_name' => 'Sales', 'level' => 'office'],
            ['name' => 'SUPERVISOR', 'display_name' => 'Supervisor', 'level' => 'office'],
            ['name' => 'MANAGER', 'display_name' => 'Manager', 'level' => 'office'],
            ['name' => 'DIRECTOR', 'display_name' => 'Director', 'level' => 'office'],
        ];

        foreach ($newRoles as $role) {
            DB::table('roles')->updateOrInsert(['name' => $role['name']], $role);
        }

        // 2. Insert new posts (skip if name already exists)
        $newPosts = [
            ['name' => 'CAD_DRAFTER', 'display_name' => 'CAD Drafter'],
            ['name' => 'DESIGN_ENGINEER', 'display_name' => 'Design Engineer'],
            ['name' => 'PRODUCT_ENGINEER', 'display_name' => 'Product Engineer'],
            ['name' => 'MANUFACTURING_ENGINEER', 'display_name' => 'Manufacturing Engineer'],
            ['name' => 'PROCUREMENT', 'display_name' => 'Procurement'],
            ['name' => 'LOGISTIK', 'display_name' => 'Logistik'],
            ['name' => 'GUDANG', 'display_name' => 'Gudang'],
            ['name' => 'INVENTORY', 'display_name' => 'Inventory'],
            ['name' => 'MILLING', 'display_name' => 'Milling'],
            ['name' => 'TURNING', 'display_name' => 'Turning'],
            ['name' => 'DRILLING', 'display_name' => 'Drilling'],
            ['name' => 'GRINDING', 'display_name' => 'Grinding'],
            ['name' => 'EDM', 'display_name' => 'EDM'],
            ['name' => 'SLOTTING', 'display_name' => 'Slotting'],
            ['name' => 'FITTER', 'display_name' => 'Fitter'],
            ['name' => 'CUTTING', 'display_name' => 'Cutting'],
            ['name' => 'BENDING', 'display_name' => 'Bending'],
            ['name' => 'ROLLING', 'display_name' => 'Rolling'],
            ['name' => 'ASSEMBLY', 'display_name' => 'Assembly'],
            ['name' => 'MECHANICAL_FITTER', 'display_name' => 'Mechanical Fitter'],
            ['name' => 'HEAT_TREATMENT', 'display_name' => 'Heat Treatment'],
            ['name' => 'POWDER_COATING', 'display_name' => 'Powder Coating'],
            ['name' => 'PAINTING', 'display_name' => 'Painting'],
            ['name' => 'GALVANIZING', 'display_name' => 'Galvanizing'],
            ['name' => 'PLATING', 'display_name' => 'Plating'],
            ['name' => 'SANDBLASTING', 'display_name' => 'Sandblasting'],
            ['name' => 'QC_INSPECTOR', 'display_name' => 'QC Inspector'],
            ['name' => 'QA_ENGINEER', 'display_name' => 'QA Engineer'],
            ['name' => 'METROLOGI', 'display_name' => 'Metrologi'],
            ['name' => 'DRIVER', 'display_name' => 'Driver'],
            ['name' => 'EKSPEDISI', 'display_name' => 'Ekspedisi'],
            ['name' => 'KURIR', 'display_name' => 'Kurir'],
            ['name' => 'ACCOUNTING', 'display_name' => 'Accounting'],
            ['name' => 'KASIR', 'display_name' => 'Kasir'],
            ['name' => 'BILLING', 'display_name' => 'Billing'],
            ['name' => 'CUSTOMER_SERVICE', 'display_name' => 'Customer Service'],
            ['name' => 'SUPERVISOR', 'display_name' => 'Supervisor'],
            ['name' => 'FOREMAN', 'display_name' => 'Foreman'],
            ['name' => 'DIRECTOR', 'display_name' => 'Director'],
            ['name' => 'PPIC', 'display_name' => 'PPIC'],
            ['name' => 'MAINTENANCE', 'display_name' => 'Maintenance'],
        ];

        foreach ($newPosts as $post) {
            DB::table('posts')->updateOrInsert(['name' => $post['name']], $post);
        }
    }

    public function down(): void
    {
        // No-op
    }
};
