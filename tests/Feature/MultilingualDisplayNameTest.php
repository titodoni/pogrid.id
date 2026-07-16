<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultilingualDisplayNameTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'subscription_status' => 'active',
        ]);
        TenantManager::setTenantId($this->tenant->id);
    }

    public function test_role_has_english_display_name(): void
    {
        $role = Role::where('name', 'DRAFTER')->first();
        $this->assertNotNull($role);
        $this->assertEquals('Drafter', $role->display_name);
    }

    public function test_role_has_indonesian_display_name(): void
    {
        $role = Role::where('name', 'DRAFTER')->first();
        $this->assertNotNull($role);
        $this->assertEquals('Drafter', $role->display_name_id);
    }

    public function test_role_indonesian_translations(): void
    {
        $translations = [
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

        foreach ($translations as $name => $expectedId) {
            $role = Role::where('name', $name)->first();
            $this->assertNotNull($role, "Role {$name} should exist");
            $this->assertEquals($expectedId, $role->display_name_id, "Role {$name} should have Indonesian translation");
        }
    }

    public function test_role_count_is_correct(): void
    {
        $this->assertEquals(17, Role::count());
    }

    public function test_post_has_english_display_name(): void
    {
        $post = Post::where('name', 'Design')->first();
        $this->assertNotNull($post);
        $this->assertEquals('Design', $post->display_name);
    }

    public function test_post_has_indonesian_display_name(): void
    {
        $post = Post::where('name', 'Design')->first();
        $this->assertNotNull($post);
        $this->assertEquals('Desain', $post->display_name_id);
    }

    public function test_post_indonesian_translations(): void
    {
        $translations = [
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

        foreach ($translations as $name => $expectedId) {
            $post = Post::where('name', $name)->first();
            $this->assertNotNull($post, "Post {$name} should exist");
            $this->assertEquals($expectedId, $post->display_name_id, "Post {$name} should have Indonesian translation");
        }
    }

    public function test_post_count_is_correct(): void
    {
        $this->assertEquals(53, Post::count());
    }

    public function test_all_roles_have_both_translations(): void
    {
        $roles = Role::all();
        foreach ($roles as $role) {
            $this->assertNotNull($role->display_name, "Role {$role->name} should have English display_name");
            $this->assertNotNull($role->display_name_id, "Role {$role->name} should have Indonesian display_name_id");
            $this->assertNotEquals('', $role->display_name);
            $this->assertNotEquals('', $role->display_name_id);
        }
    }

    public function test_all_posts_have_both_translations(): void
    {
        $posts = Post::all();
        foreach ($posts as $post) {
            $this->assertNotNull($post->display_name, "Post {$post->name} should have English display_name");
            $this->assertNotNull($post->display_name_id, "Post {$post->name} should have Indonesian display_name_id");
            $this->assertNotEquals('', $post->display_name);
            $this->assertNotEquals('', $post->display_name_id);
        }
    }

    public function test_english_fallback_when_indonesian_missing(): void
    {
        $role = Role::create([
            'name' => 'TEST_ROLE',
            'display_name' => 'Test Role',
            'display_name_id' => null,
            'level' => 'production',
        ]);

        $this->assertEquals('Test Role', $role->display_name);
        $this->assertNull($role->display_name_id);
    }

    public function test_indonesian_fallback_to_english_when_missing(): void
    {
        $role = Role::create([
            'name' => 'TEST_ROLE2',
            'display_name' => 'Test Role',
            'display_name_id' => '',
            'level' => 'production',
        ]);

        $this->assertEquals('Test Role', $role->display_name);
        $this->assertEquals('', $role->display_name_id);
    }
}
