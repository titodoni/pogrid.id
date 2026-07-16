<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Tenant
        $tenant = Tenant::create([
            'company_name' => 'Teknik Mandiri',
            'slug' => 'teknik-mandiri',
            'subscription_status' => 'active',
            'trial_ends_at' => now()->addDays(30),
        ]);

        TenantManager::setTenantId($tenant->id);

        // 2. Seed roles (skip if already exist from migration)
        $roles = [
            'DRAFTER' => Role::firstOrCreate(['name' => 'DRAFTER'], ['display_name' => 'Drafter', 'display_name_id' => 'Drafter', 'level' => 'production']),
            'PURCHASING' => Role::firstOrCreate(['name' => 'PURCHASING'], ['display_name' => 'Purchasing', 'display_name_id' => 'Pembelian', 'level' => 'production']),
            'MACHINING' => Role::firstOrCreate(['name' => 'MACHINING'], ['display_name' => 'Operator', 'display_name_id' => 'Operator Mesin', 'level' => 'production']),
            'FABRICATION' => Role::firstOrCreate(['name' => 'FABRICATION'], ['display_name' => 'Fabrication', 'display_name_id' => 'Fabrikasi', 'level' => 'production']),
            'PRODUCTION' => Role::firstOrCreate(['name' => 'PRODUCTION'], ['display_name' => 'Helper', 'display_name_id' => 'Helper', 'level' => 'production']),
            'QC' => Role::firstOrCreate(['name' => 'QC'], ['display_name' => 'QC Inspector', 'display_name_id' => 'Inspektor QC', 'level' => 'production']),
            'DELIVERY' => Role::firstOrCreate(['name' => 'DELIVERY'], ['display_name' => 'Delivery', 'display_name_id' => 'Pengiriman', 'level' => 'production']),
            'FINANCE' => Role::firstOrCreate(['name' => 'FINANCE'], ['display_name' => 'Finance', 'display_name_id' => 'Keuangan', 'level' => 'production']),
            'STAFF' => Role::firstOrCreate(['name' => 'STAFF'], ['display_name' => 'Staff', 'display_name_id' => 'Staf', 'level' => 'office']),
            'ASSEMBLY' => Role::firstOrCreate(['name' => 'ASSEMBLY'], ['display_name' => 'Assembly', 'display_name_id' => 'Perakitan', 'level' => 'production']),
            'SURFACE' => Role::firstOrCreate(['name' => 'SURFACE'], ['display_name' => 'Surface Treatment', 'display_name_id' => 'Perawatan Permukaan', 'level' => 'production']),
            'PPIC' => Role::firstOrCreate(['name' => 'PPIC'], ['display_name' => 'PPIC', 'display_name_id' => 'PPIC', 'level' => 'production']),
            'MAINTENANCE' => Role::firstOrCreate(['name' => 'MAINTENANCE'], ['display_name' => 'Maintenance', 'display_name_id' => 'Perawatan', 'level' => 'production']),
            'SALES' => Role::firstOrCreate(['name' => 'SALES'], ['display_name' => 'Sales', 'display_name_id' => 'Penjualan', 'level' => 'office']),
            'SUPERVISOR' => Role::firstOrCreate(['name' => 'SUPERVISOR'], ['display_name' => 'Supervisor', 'display_name_id' => 'Supervisor', 'level' => 'office']),
            'MANAGER' => Role::firstOrCreate(['name' => 'MANAGER'], ['display_name' => 'Manager', 'display_name_id' => 'Manajer', 'level' => 'office']),
            'DIRECTOR' => Role::firstOrCreate(['name' => 'DIRECTOR'], ['display_name' => 'Director', 'display_name_id' => 'Direktur', 'level' => 'office']),
        ];

        // 3. Seed posts (skip if already exist from migration)
        $posts = [
            'Design' => Post::firstOrCreate(['name' => 'Design'], ['display_name' => 'Design', 'display_name_id' => 'Desain']),
            'Material' => Post::firstOrCreate(['name' => 'Material'], ['display_name' => 'Material', 'display_name_id' => 'Material']),
            'Vendor' => Post::firstOrCreate(['name' => 'Vendor'], ['display_name' => 'Vendor', 'display_name_id' => 'Vendor']),
            'CNC' => Post::firstOrCreate(['name' => 'CNC'], ['display_name' => 'CNC', 'display_name_id' => 'CNC']),
            'Milling' => Post::firstOrCreate(['name' => 'Milling'], ['display_name' => 'Milling', 'display_name_id' => 'Freis']),
            'Welder' => Post::firstOrCreate(['name' => 'Welder'], ['display_name' => 'Welder', 'display_name_id' => 'Las']),
            'Helper' => Post::firstOrCreate(['name' => 'Helper'], ['display_name' => 'Helper', 'display_name_id' => 'Helper']),
            'QC' => Post::firstOrCreate(['name' => 'QC'], ['display_name' => 'QC', 'display_name_id' => 'QC']),
            'Delivery' => Post::firstOrCreate(['name' => 'Delivery'], ['display_name' => 'Delivery', 'display_name_id' => 'Pengiriman']),
            'Finance' => Post::firstOrCreate(['name' => 'Finance'], ['display_name' => 'Finance', 'display_name_id' => 'Keuangan']),
            'Sales' => Post::firstOrCreate(['name' => 'Sales'], ['display_name' => 'Sales', 'display_name_id' => 'Penjualan']),
            'Admin' => Post::firstOrCreate(['name' => 'Admin'], ['display_name' => 'Admin', 'display_name_id' => 'Admin']),
            'Manager' => Post::firstOrCreate(['name' => 'Manager'], ['display_name' => 'Manager', 'display_name_id' => 'Manajer']),
            'CAD_DRAFTER' => Post::firstOrCreate(['name' => 'CAD_DRAFTER'], ['display_name' => 'CAD Drafter', 'display_name_id' => 'Drafter CAD']),
            'DESIGN_ENGINEER' => Post::firstOrCreate(['name' => 'DESIGN_ENGINEER'], ['display_name' => 'Design Engineer', 'display_name_id' => 'Insinyur Desain']),
            'PRODUCT_ENGINEER' => Post::firstOrCreate(['name' => 'PRODUCT_ENGINEER'], ['display_name' => 'Product Engineer', 'display_name_id' => 'Insinyur Produk']),
            'MANUFACTURING_ENGINEER' => Post::firstOrCreate(['name' => 'MANUFACTURING_ENGINEER'], ['display_name' => 'Manufacturing Engineer', 'display_name_id' => 'Insinyur Manufaktur']),
            'PROCUREMENT' => Post::firstOrCreate(['name' => 'PROCUREMENT'], ['display_name' => 'Procurement', 'display_name_id' => 'Pengadaan']),
            'LOGISTIK' => Post::firstOrCreate(['name' => 'LOGISTIK'], ['display_name' => 'Logistik', 'display_name_id' => 'Logistik']),
            'GUDANG' => Post::firstOrCreate(['name' => 'GUDANG'], ['display_name' => 'Gudang', 'display_name_id' => 'Gudang']),
            'INVENTORY' => Post::firstOrCreate(['name' => 'INVENTORY'], ['display_name' => 'Inventory', 'display_name_id' => 'Inventaris']),
            'MILLING' => Post::firstOrCreate(['name' => 'MILLING'], ['display_name' => 'Milling', 'display_name_id' => 'Freis']),
            'TURNING' => Post::firstOrCreate(['name' => 'TURNING'], ['display_name' => 'Turning', 'display_name_id' => 'Bubut']),
            'DRILLING' => Post::firstOrCreate(['name' => 'DRILLING'], ['display_name' => 'Drilling', 'display_name_id' => 'Bor']),
            'GRINDING' => Post::firstOrCreate(['name' => 'GRINDING'], ['display_name' => 'Grinding', 'display_name_id' => 'Gerinda']),
            'EDM' => Post::firstOrCreate(['name' => 'EDM'], ['display_name' => 'EDM', 'display_name_id' => 'EDM']),
            'SLOTTING' => Post::firstOrCreate(['name' => 'SLOTTING'], ['display_name' => 'Slotting', 'display_name_id' => 'Sekrap']),
            'FITTER' => Post::firstOrCreate(['name' => 'FITTER'], ['display_name' => 'Fitter', 'display_name_id' => 'Fitter']),
            'CUTTING' => Post::firstOrCreate(['name' => 'CUTTING'], ['display_name' => 'Cutting', 'display_name_id' => 'Potong']),
            'BENDING' => Post::firstOrCreate(['name' => 'BENDING'], ['display_name' => 'Bending', 'display_name_id' => 'Tekuk']),
            'ROLLING' => Post::firstOrCreate(['name' => 'ROLLING'], ['display_name' => 'Rolling', 'display_name_id' => 'Gulung']),
            'ASSEMBLY' => Post::firstOrCreate(['name' => 'ASSEMBLY'], ['display_name' => 'Assembly', 'display_name_id' => 'Perakitan']),
            'MECHANICAL_FITTER' => Post::firstOrCreate(['name' => 'MECHANICAL_FITTER'], ['display_name' => 'Mechanical Fitter', 'display_name_id' => 'Fitter Mekanik']),
            'HEAT_TREATMENT' => Post::firstOrCreate(['name' => 'HEAT_TREATMENT'], ['display_name' => 'Heat Treatment', 'display_name_id' => 'Perlakuan Panas']),
            'POWDER_COATING' => Post::firstOrCreate(['name' => 'POWDER_COATING'], ['display_name' => 'Powder Coating', 'display_name_id' => 'Lapis Serbuk']),
            'PAINTING' => Post::firstOrCreate(['name' => 'PAINTING'], ['display_name' => 'Painting', 'display_name_id' => 'Pengecatan']),
            'GALVANIZING' => Post::firstOrCreate(['name' => 'GALVANIZING'], ['display_name' => 'Galvanizing', 'display_name_id' => 'Galvanis']),
            'PLATING' => Post::firstOrCreate(['name' => 'PLATING'], ['display_name' => 'Plating', 'display_name_id' => 'Lapis']),
            'SANDBLASTING' => Post::firstOrCreate(['name' => 'SANDBLASTING'], ['display_name' => 'Sandblasting', 'display_name_id' => 'Sandblasting']),
            'QC_INSPECTOR' => Post::firstOrCreate(['name' => 'QC_INSPECTOR'], ['display_name' => 'QC Inspector', 'display_name_id' => 'Inspektor QC']),
            'QA_ENGINEER' => Post::firstOrCreate(['name' => 'QA_ENGINEER'], ['display_name' => 'QA Engineer', 'display_name_id' => 'Insinyur QA']),
            'METROLOGI' => Post::firstOrCreate(['name' => 'METROLOGI'], ['display_name' => 'Metrologi', 'display_name_id' => 'Metrologi']),
            'DRIVER' => Post::firstOrCreate(['name' => 'DRIVER'], ['display_name' => 'Driver', 'display_name_id' => 'Sopir']),
            'EKSPEDISI' => Post::firstOrCreate(['name' => 'EKSPEDISI'], ['display_name' => 'Ekspedisi', 'display_name_id' => 'Ekspedisi']),
            'KURIR' => Post::firstOrCreate(['name' => 'KURIR'], ['display_name' => 'Kurir', 'display_name_id' => 'Kurir']),
            'ACCOUNTING' => Post::firstOrCreate(['name' => 'ACCOUNTING'], ['display_name' => 'Accounting', 'display_name_id' => 'Akuntansi']),
            'KASIR' => Post::firstOrCreate(['name' => 'KASIR'], ['display_name' => 'Kasir', 'display_name_id' => 'Kasir']),
            'BILLING' => Post::firstOrCreate(['name' => 'BILLING'], ['display_name' => 'Billing', 'display_name_id' => 'Penagihan']),
            'CUSTOMER_SERVICE' => Post::firstOrCreate(['name' => 'CUSTOMER_SERVICE'], ['display_name' => 'Customer Service', 'display_name_id' => 'Layanan Pelanggan']),
            'SUPERVISOR' => Post::firstOrCreate(['name' => 'SUPERVISOR'], ['display_name' => 'Supervisor', 'display_name_id' => 'Supervisor']),
            'FOREMAN' => Post::firstOrCreate(['name' => 'FOREMAN'], ['display_name' => 'Foreman', 'display_name_id' => 'Mandor']),
            'DIRECTOR' => Post::firstOrCreate(['name' => 'DIRECTOR'], ['display_name' => 'Director', 'display_name_id' => 'Direktur']),
            'PPIC' => Post::firstOrCreate(['name' => 'PPIC'], ['display_name' => 'PPIC', 'display_name_id' => 'PPIC']),
            'MAINTENANCE' => Post::firstOrCreate(['name' => 'MAINTENANCE'], ['display_name' => 'Maintenance', 'display_name_id' => 'Perawatan']),
        ];

        // 4. Create Office Staff (Password Login: poiuy)
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sari Dewi',
            'username' => 'sari',
            'email' => 'owner@teknikmandiri.com',
            'password' => Hash::make('poiuy'),
            'role_id' => $roles['STAFF']->id,
            'post_id' => $posts['Manager']->id,
            'is_owner' => true,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Budi Santoso',
            'username' => 'budi',
            'email' => 'admin@teknikmandiri.com',
            'password' => Hash::make('poiuy'),
            'role_id' => $roles['STAFF']->id,
            'post_id' => $posts['Admin']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Fitri Handayani',
            'username' => 'fitri',
            'email' => 'sales@teknikmandiri.com',
            'password' => Hash::make('poiuy'),
            'role_id' => $roles['STAFF']->id,
            'post_id' => $posts['Sales']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Dimas Ardiansyah',
            'username' => 'dimas',
            'email' => 'manager@teknikmandiri.com',
            'password' => Hash::make('poiuy'),
            'role_id' => $roles['STAFF']->id,
            'post_id' => $posts['Manager']->id,
        ]);

        // 5. Create Floor Staff (PIN Login: 0000)
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Rina Wulandari',
            'pin' => Hash::make('0000'),
            'role_id' => $roles['PURCHASING']->id,
            'post_id' => $posts['Material']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Dewi Sartika',
            'pin' => Hash::make('0000'),
            'role_id' => $roles['FINANCE']->id,
            'post_id' => $posts['Finance']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Arief Prasetyo',
            'pin' => Hash::make('0000'),
            'role_id' => $roles['DRAFTER']->id,
            'post_id' => $posts['Design']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Hendra Gunawan',
            'pin' => Hash::make('0000'),
            'role_id' => $roles['MACHINING']->id,
            'post_id' => $posts['CNC']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Bambang Supriyadi',
            'pin' => Hash::make('0000'),
            'role_id' => $roles['FABRICATION']->id,
            'post_id' => $posts['Welder']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Agus Hermawan',
            'pin' => Hash::make('0000'),
            'role_id' => $roles['QC']->id,
            'post_id' => $posts['QC']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Slamet Riyadi',
            'pin' => Hash::make('0000'),
            'role_id' => $roles['DELIVERY']->id,
            'post_id' => $posts['Delivery']->id,
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Joko Susilo',
            'pin' => Hash::make('0000'),
            'role_id' => $roles['PRODUCTION']->id,
            'post_id' => $posts['Helper']->id,
        ]);

        // 6. Create Purchase Orders (POs)
        $po1 = Po::create([
            'tenant_id' => $tenant->id,
            'po_number' => 'PO-2026-001',
            'client_name' => 'PT Astra Otoparts',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $po2 = Po::create([
            'tenant_id' => $tenant->id,
            'po_number' => 'PO-2026-002',
            'client_name' => 'CV Indonesia Jaya',
            'global_deadline' => now()->addDays(2),
            'status' => 'PENDING',
        ]);

        // 7. Create Items under POs
        Item::create([
            'tenant_id' => $tenant->id,
            'po_id' => $po1->id,
            'item_name' => 'Shaft S45C',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'Fabrication'],
            'status' => 'PENDING',
        ]);

        Item::create([
            'tenant_id' => $tenant->id,
            'po_id' => $po1->id,
            'item_name' => 'Flange Plate',
            'target_qty' => 20,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        Item::create([
            'tenant_id' => $tenant->id,
            'po_id' => $po2->id,
            'item_name' => 'Special Bracket',
            'target_qty' => 1,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'Fabrication'],
            'status' => 'PENDING',
        ]);
    }
}
