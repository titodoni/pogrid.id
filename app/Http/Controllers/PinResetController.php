<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PinResetController extends Controller
{
    public function requestPinReset(Request $request, string $slug)
    {
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->firstOrFail();
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
        ]);

        $user = User::where('id', $request->user_id)
            ->where('tenant_id', $tenant->id)
            ->whereNotNull('pin')
            ->firstOrFail();

        // Prevent spam: check if an unresolved PIN reset alert already exists for this user
        $existingAlert = Alert::where('tenant_id', $tenant->id)
            ->where('message', 'LIKE', "PIN Reset Requested for {$user->name}%")
            ->where('is_resolved', false)
            ->first();

        if ($existingAlert) {
            return back()->with('error', 'A PIN reset request for this worker is already pending. Please wait for admin approval.');
        }

        // Mark user as having requested PIN reset
        $user->update(['pin_reset_requested' => true]);

        // Create a BLUE alert visible to admin
        Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => 0,
            'severity' => 'BLUE',
            'message' => "PIN Reset Requested for {$user->name} (ID:{$user->id}) by worker.",
            'is_resolved' => false,
        ]);

        return back()->with('success', 'PIN reset request sent to admin. Please wait for approval.');
    }

    public function approvePinReset(Request $request, int $alertId)
    {
        $alert = Alert::findOrFail($alertId);

        if ($alert->is_resolved) {
            return back()->with('error', 'This PIN reset request has already been resolved.');
        }

        // Parse user ID from the alert message
        preg_match('/ID:(\d+)/', $alert->message, $matches);
        if (! $matches) {
            return back()->with('error', 'Could not identify the user from this alert.');
        }

        $userId = (int) $matches[1];
        $user = User::findOrFail($userId);

        // Generate a new random 4-digit PIN
        $newPin = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        $user->update([
            'pin' => Hash::make($newPin),
            'pin_reset_requested' => false,
        ]);

        // Mark alert as resolved
        $alert->update([
            'is_resolved' => true,
            'message' => "PIN Reset Approved for {$user->name}. New PIN: {$newPin}",
        ]);

        return back()->with('success', "PIN reset approved. New PIN for {$user->name}: {$newPin}");
    }
}
