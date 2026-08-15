<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Spatie\Backup\BackupDestination\BackupDestination;

class HealthController extends Controller
{
    public function index()
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'queue' => $this->checkQueue(),
            'storage' => $this->checkStorage(),
            'cache' => $this->checkCache(),
        ];

        $backups = $this->listBackups();

        $allHealthy = collect($checks)->every(fn ($c) => $c['healthy'] === true);

        return Inertia::render('Superpowers/Health/Index', [
            'checks' => $checks,
            'backups' => $backups,
            'disk' => $this->diskUsage(),
            'healthy' => $allHealthy,
        ]);
    }

    public function triggerBackup(Request $request)
    {
        try {
            Artisan::queue('backup:run');
        } catch (\Throwable $e) {
            // The spatie/laravel-backup package may not be installed yet;
            // fall back to a synchronous call if queue is unavailable.
            try {
                Artisan::call('backup:run');
            } catch (\Throwable $ex) {
                return back()->with('error', 'Backup gagal dijalankan: '.$ex->getMessage());
            }
        }

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'backup.triggered',
        ]);

        return back()->with('success', 'Backup dijadwalkan. Proses berjalan di latar belakang.');
    }

    protected function checkDatabase(): array
    {
        try {
            DB::select('SELECT 1');

            return ['label' => 'Database', 'healthy' => true, 'detail' => 'Terhubung'];
        } catch (\Throwable $e) {
            return ['label' => 'Database', 'healthy' => false, 'detail' => $e->getMessage()];
        }
    }

    protected function checkQueue(): array
    {
        try {
            $size = (int) DB::table('jobs')->count();
            $failed = (int) DB::table('failed_jobs')->count();

            return [
                'label' => 'Queue',
                'healthy' => $failed === 0,
                'detail' => "{$size} antrian, {$failed} gagal",
            ];
        } catch (\Throwable $e) {
            return ['label' => 'Queue', 'healthy' => false, 'detail' => $e->getMessage()];
        }
    }

    protected function checkStorage(): array
    {
        try {
            $canWrite = Storage::put('health-check.txt', 'ok');
            if ($canWrite) {
                Storage::delete('health-check.txt');
            }

            return [
                'label' => 'Storage',
                'healthy' => $canWrite,
                'detail' => $canWrite ? 'Dapat ditulis' : 'Tidak dapat ditulis',
            ];
        } catch (\Throwable $e) {
            return ['label' => 'Storage', 'healthy' => false, 'detail' => $e->getMessage()];
        }
    }

    protected function checkCache(): array
    {
        try {
            Cache::put('health-check', 'ok', 10);
            $value = Cache::get('health-check');

            return [
                'label' => 'Cache',
                'healthy' => $value === 'ok',
                'detail' => $value === 'ok' ? 'Responsif' : 'Tidak responsif',
            ];
        } catch (\Throwable $e) {
            return ['label' => 'Cache', 'healthy' => false, 'detail' => $e->getMessage()];
        }
    }

    protected function listBackups(): array
    {
        if (! class_exists(BackupDestination::class)) {
            return [];
        }

        try {
            $disk = config('backup.backup.destination.disks.0', 'local');
            $files = collect(Storage::disk($disk)->allFiles())
                ->filter(fn ($path) => str_ends_with($path, '.zip'))
                ->map(fn ($path) => [
                    'path' => $path,
                    'size' => Storage::disk($disk)->size($path),
                    'modified' => date('Y-m-d H:i:s', Storage::disk($disk)->lastModified($path)),
                ])
                ->sortByDesc('modified')
                ->take(10)
                ->values();

            return $files->all();
        } catch (\Throwable) {
            return [];
        }
    }

    protected function diskUsage(): array
    {
        try {
            $total = @disk_total_space(base_path()) ?: 0;
            $free = @disk_free_space(base_path()) ?: 0;

            return [
                'total_bytes' => (int) $total,
                'free_bytes' => (int) $free,
                'used_bytes' => (int) ($total - $free),
                'used_percent' => $total > 0 ? round((($total - $free) / $total) * 100, 1) : 0,
            ];
        } catch (\Throwable) {
            return ['total_bytes' => 0, 'free_bytes' => 0, 'used_bytes' => 0, 'used_percent' => 0];
        }
    }
}
