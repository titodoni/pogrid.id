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

        // 2. Create Owner User (Guard A login)
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Budi Santoso',
            'email' => 'budi@teknikmandiri.com',
            'password' => Hash::make('password'),
            'role' => 'OWNER',
        ]);

        // 3. Create Worker Users (Guard B login)
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Joko (CNC Operator)',
            'pin' => Hash::make('1234'),
            'role' => 'WORKER',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Agus (Welder/Fitter)',
            'pin' => Hash::make('5678'),
            'role' => 'WORKER',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Siti (QC Inspector)',
            'pin' => Hash::make('9999'),
            'role' => 'QC',
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
            'item_name' => 'Shaft S45C (CNC + FABRIKASI)',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC', 'FABRIKASI'],
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
            'item_name' => 'Special Bracket (CNC + QC)',
            'target_qty' => 1,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC', 'QC'],
            'status' => 'PENDING',
        ]);
    }
}
