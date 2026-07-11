<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add FINANCE as a production-level role
        DB::table('roles')->insert([
            'name' => 'FINANCE',
            'display_name' => 'Finance',
            'level' => 'production',
        ]);

        $financeRoleId = DB::table('roles')->where('name', 'FINANCE')->value('id');

        // Migrate existing users who were mapped to STAFF+Finance to FINANCE role
        $staffRoleId = DB::table('roles')->where('name', 'STAFF')->value('id');
        $financePostId = DB::table('posts')->where('name', 'Finance')->value('id');

        DB::table('users')
            ->where('role_id', $staffRoleId)
            ->where('post_id', $financePostId)
            ->update(['role_id' => $financeRoleId]);
    }

    public function down(): void
    {
        $financeRoleId = DB::table('roles')->where('name', 'FINANCE')->value('id');
        $staffRoleId = DB::table('roles')->where('name', 'STAFF')->value('id');
        $financePostId = DB::table('posts')->where('name', 'Finance')->value('id');

        // Move FINANCE users back to STAFF+Finance
        DB::table('users')
            ->where('role_id', $financeRoleId)
            ->where('post_id', $financePostId)
            ->update(['role_id' => $staffRoleId]);

        DB::table('roles')->where('name', 'FINANCE')->delete();
    }
};
