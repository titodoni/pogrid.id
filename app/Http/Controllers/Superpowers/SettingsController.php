<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivityLog;
use App\Models\PlatformSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index()
    {
        return Inertia::render('Superpowers/Settings/Index', [
            'maintenance_mode' => PlatformSetting::isMaintenanceMode(),
            'maintenance_message' => PlatformSetting::getMaintenanceMessage(),
        ]);
    }

    public function toggleMaintenance(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $enabled = (bool) $data['enabled'];
        PlatformSetting::set('maintenance_mode', $enabled ? '1' : '0');

        // Invalidate the cache so the CheckTenantMaintenance middleware picks up
        // the new value immediately on the next request.
        Cache::forget('platform:maintenance_mode');

        // Clear app cache so config-level caches don't shadow the toggle.
        try {
            Artisan::call('cache:clear');
        } catch (\Throwable) {
            // Non-fatal — the DB is the source of truth and cache was forgotten above.
        }

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'maintenance.toggled',
            'metadata' => [
                'enabled' => $enabled,
            ],
        ]);

        return back()->with(
            'success',
            $enabled
                ? 'Mode maintenance diaktifkan. Tenant non-superadmin akan melihat halaman 503.'
                : 'Mode maintenance dinonaktifkan.'
        );
    }

    public function updateMaintenanceMessage(Request $request)
    {
        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $message = $data['message'] ? trim($data['message']) : null;
        PlatformSetting::set('maintenance_message', $message);

        Cache::forget('platform:maintenance_message');

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'maintenance.message_updated',
            'metadata' => [
                'message' => $message,
            ],
        ]);

        return back()->with('success', 'Pesan maintenance diperbarui.');
    }
}
