<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->enum('level', ['production', 'office'])->default('production');
            $table->timestamps();
        });

        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->constrained();
            $table->foreignId('post_id')->nullable()->constrained();
        });

        // Seed roles
        $roles = [
            ['name' => 'DRAFTER', 'display_name' => 'Drafter', 'level' => 'production'],
            ['name' => 'PURCHASING', 'display_name' => 'Purchasing', 'level' => 'production'],
            ['name' => 'MACHINING', 'display_name' => 'Operator', 'level' => 'production'],
            ['name' => 'FABRICATION', 'display_name' => 'Fabrication', 'level' => 'production'],
            ['name' => 'PRODUCTION', 'display_name' => 'Helper', 'level' => 'production'],
            ['name' => 'QC', 'display_name' => 'QC Inspector', 'level' => 'production'],
            ['name' => 'DELIVERY', 'display_name' => 'Delivery', 'level' => 'production'],
            ['name' => 'STAFF', 'display_name' => 'Staff', 'level' => 'office'],
        ];
        DB::table('roles')->insert($roles);

        // Seed posts
        $posts = [
            ['name' => 'Design', 'display_name' => 'Design'],
            ['name' => 'Material', 'display_name' => 'Material'],
            ['name' => 'Vendor', 'display_name' => 'Vendor'],
            ['name' => 'CNC', 'display_name' => 'CNC'],
            ['name' => 'Milling', 'display_name' => 'Milling'],
            ['name' => 'Welder', 'display_name' => 'Welder'],
            ['name' => 'Helper', 'display_name' => 'Helper'],
            ['name' => 'QC', 'display_name' => 'QC'],
            ['name' => 'Delivery', 'display_name' => 'Delivery'],
            ['name' => 'Finance', 'display_name' => 'Finance'],
            ['name' => 'Sales', 'display_name' => 'Sales'],
            ['name' => 'Admin', 'display_name' => 'Admin'],
            ['name' => 'Manager', 'display_name' => 'Manager'],
        ];
        DB::table('posts')->insert($posts);

        // Migrate existing role values to role_id
        $roleMap = [
            'OWNER' => 'STAFF',
            'ADMIN' => 'STAFF',
            'SALES' => 'STAFF',
            'MANAGER' => 'STAFF',
            'PURCHASING' => 'PURCHASING',
            'FINANCE' => 'STAFF',
            'DRAFTER' => 'DRAFTER',
            'MACHINING' => 'MACHINING',
            'CNC' => 'MACHINING',
            'FABRICATION' => 'FABRICATION',
            'QC' => 'QC',
            'DELIVERY' => 'DELIVERY',
            'WORKER' => 'PRODUCTION',
        ];

        $postMap = [
            'OWNER' => 'Manager',
            'ADMIN' => 'Admin',
            'SALES' => 'Sales',
            'MANAGER' => 'Manager',
            'PURCHASING' => 'Material',
            'FINANCE' => 'Finance',
            'DRAFTER' => 'Design',
            'MACHINING' => 'CNC',
            'CNC' => 'CNC',
            'FABRICATION' => 'Welder',
            'QC' => 'QC',
            'DELIVERY' => 'Delivery',
            'WORKER' => 'Helper',
        ];

        foreach ($roleMap as $oldRole => $newRoleName) {
            $roleId = DB::table('roles')->where('name', $newRoleName)->value('id');
            $postId = null;
            if (isset($postMap[$oldRole])) {
                $postId = DB::table('posts')->where('name', $postMap[$oldRole])->value('id');
            }
            DB::table('users')
                ->where('role', $oldRole)
                ->update(['role_id' => $roleId, 'post_id' => $postId]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['post_id']);
            $table->dropColumn(['role_id', 'post_id']);
        });
        Schema::dropIfExists('posts');
        Schema::dropIfExists('roles');
    }
};
