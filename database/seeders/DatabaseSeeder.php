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
            'DRAFTER' => Role::firstOrCreate(['name' => 'DRAFTER'], ['display_name' => 'Drafter', 'level' => 'production']),
            'PURCHASING' => Role::firstOrCreate(['name' => 'PURCHASING'], ['display_name' => 'Purchasing', 'level' => 'production']),
            'MACHINING' => Role::firstOrCreate(['name' => 'MACHINING'], ['display_name' => 'Operator', 'level' => 'production']),
            'FABRICATION' => Role::firstOrCreate(['name' => 'FABRICATION'], ['display_name' => 'Fabrication', 'level' => 'production']),
            'PRODUCTION' => Role::firstOrCreate(['name' => 'PRODUCTION'], ['display_name' => 'Helper', 'level' => 'production']),
            'QC' => Role::firstOrCreate(['name' => 'QC'], ['display_name' => 'QC Inspector', 'level' => 'production']),
            'DELIVERY' => Role::firstOrCreate(['name' => 'DELIVERY'], ['display_name' => 'Delivery', 'level' => 'production']),
            'STAFF' => Role::firstOrCreate(['name' => 'STAFF'], ['display_name' => 'Staff', 'level' => 'office']),
        ];

        // 3. Seed posts (skip if already exist from migration)
        $posts = [
            'Design' => Post::firstOrCreate(['name' => 'Design'], ['display_name' => 'Design']),
            'Material' => Post::firstOrCreate(['name' => 'Material'], ['display_name' => 'Material']),
            'Vendor' => Post::firstOrCreate(['name' => 'Vendor'], ['display_name' => 'Vendor']),
            'CNC' => Post::firstOrCreate(['name' => 'CNC'], ['display_name' => 'CNC']),
            'Milling' => Post::firstOrCreate(['name' => 'Milling'], ['display_name' => 'Milling']),
            'Welder' => Post::firstOrCreate(['name' => 'Welder'], ['display_name' => 'Welder']),
            'Helper' => Post::firstOrCreate(['name' => 'Helper'], ['display_name' => 'Helper']),
            'QC' => Post::firstOrCreate(['name' => 'QC'], ['display_name' => 'QC']),
            'Delivery' => Post::firstOrCreate(['name' => 'Delivery'], ['display_name' => 'Delivery']),
            'Finance' => Post::firstOrCreate(['name' => 'Finance'], ['display_name' => 'Finance']),
            'Sales' => Post::firstOrCreate(['name' => 'Sales'], ['display_name' => 'Sales']),
            'Admin' => Post::firstOrCreate(['name' => 'Admin'], ['display_name' => 'Admin']),
            'Manager' => Post::firstOrCreate(['name' => 'Manager'], ['display_name' => 'Manager']),
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
            'item_name' => 'Shaft S45C (CNC + Fabrication)',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'Fabrication'],
            'status' => 'PENDING',
        ]);

        Item::create([
            'tenant_id' => $tenant->id,
            'po_id' => $po1->id,
            'item_name' => 'Flange Plate (CNC)',
            'target_qty' => 20,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        Item::create([
            'tenant_id' => $tenant->id,
            'po_id' => $po2->id,
            'item_name' => 'Special Bracket (CNC + Fabrication)',
            'target_qty' => 1,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'Fabrication'],
            'status' => 'PENDING',
        ]);
    }
}
