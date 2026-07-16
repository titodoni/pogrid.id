<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $translations = [
        'ASSEMBLY' => 'Perakitan',
        'PPIC' => 'PPIC',
        'MAINTENANCE' => 'Perawatan',
    ];

    public function up(): void
    {
        foreach ($this->translations as $name => $displayNameId) {
            DB::table('posts')
                ->where('name', $name)
                ->whereNull('display_name_id')
                ->update(['display_name_id' => $displayNameId]);
        }
    }

    public function down(): void
    {
        DB::table('posts')
            ->whereIn('name', array_keys($this->translations))
            ->update(['display_name_id' => null]);
    }
};
