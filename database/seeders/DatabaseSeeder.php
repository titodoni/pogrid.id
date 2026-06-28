<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Po;
use App\Models\Item;
use App\Services\TenantManager;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Tenant
        $tenant = Tenant::create([
            'company_name' => 'Teknik Mandiri',
            'slug' => 'teknik-mandiri',
            'subscription_status' => 'active',
            'trial_ends_at' => now()->addDays(30),
        ]);

        // Set tenant context for model creation
        TenantManager::setTenantId($tenant->id);

        // 2. Create Office Staff (Password Login: qwerty)
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Budi Santoso (Admin)',
            'username' => 'budi',
            'email' => 'budi@teknikmandiri.com',
            'password' => Hash::make('qwerty'),
            'role' => 'ADMIN',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sales Staff',
            'username' => 'sales',
            'email' => 'sales@teknikmandiri.com',
            'password' => Hash::make('qwerty'),
            'role' => 'SALES',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Purchasing Agent',
            'username' => 'purchasing',
            'email' => 'purchasing@teknikmandiri.com',
            'password' => Hash::make('qwerty'),
            'role' => 'PURCHASING',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Finance Controller',
            'username' => 'finance',
            'email' => 'finance@teknikmandiri.com',
            'password' => Hash::make('qwerty'),
            'role' => 'FINANCE',
        ]);

        // 3. Create Floor Staff (PIN Login: 0000)
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Drafter Designer',
            'pin' => Hash::make('0000'),
            'role' => 'DRAFTER',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'CNC Specialist',
            'pin' => Hash::make('0000'),
            'role' => 'CNC',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Fabricator Welder',
            'pin' => Hash::make('0000'),
            'role' => 'FABRICATION',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'QC Inspector',
            'pin' => Hash::make('0000'),
            'role' => 'QC',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Delivery Courier',
            'pin' => Hash::make('0000'),
            'role' => 'DELIVERY',
        ]);

        // 4. Create Purchase Orders (POs)
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

        // 5. Create Items under POs
        // This will automatically trigger ItemObserver to create parallel item_progress entries!
        Item::create([
            'tenant_id' => $tenant->id,
            'po_id' => $po1->id,
            'item_name' => 'Shaft S45C (CNC + Fabrication)',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC', 'Fabrication'],
            'status' => 'PENDING',
        ]);

        Item::create([
            'tenant_id' => $tenant->id,
            'po_id' => $po1->id,
            'item_name' => 'Flange Plate (CNC)',
            'target_qty' => 20,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        Item::create([
            'tenant_id' => $tenant->id,
            'po_id' => $po2->id,
            'item_name' => 'Special Bracket (CNC + Fabrication)',
            'target_qty' => 1,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC', 'Fabrication'],
            'status' => 'PENDING',
        ]);
    }
}
