<?php

namespace App\Http\Controllers;

use App\Events\ProductionTerminated;
use App\Jobs\GenerateSunkCostInvoiceJob;
use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OwnerDashboardController extends Controller
{
    public function index()
    {
        if (auth()->check()) {
            $tenant = Tenant::find(TenantManager::getTenantId());
            if ($tenant) {
                return redirect("/c/{$tenant->slug}");
            }
        }

        return redirect('/login');
    }

    public function updateCompany(Request $request)
    {
        $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
        ]);

        $tenant = Tenant::find(TenantManager::getTenantId());
        $tenant->update([
            'company_name' => $request->company_name,
        ]);

        return back()->with('success', 'Company settings updated successfully.');
    }

    public function create()
    {
        $user = auth()->user();

        if ($user->role === 'OWNER') {
            abort(403, 'Owners cannot create or broadcast POs. Please assign an Admin user.');
        }

        // Ensure tenant context is set for this request
        TenantManager::setTenantId($user->tenant_id);

        return Inertia::render('Owner/CreatePo', [
            'tenant' => $user->tenant,
            'auth_user' => $user,
        ]);
    }

    public function createPo(Request $request)
    {
        $user = auth()->user();

        if ($user->role === 'OWNER') {
            abort(403, 'Owners cannot create or broadcast POs. Please assign an Admin user.');
        }

        // Ensure tenant context for this request
        TenantManager::setTenantId($user->tenant_id);

        $request->validate([
            'po_number' => [
                'required',
                'string',
                Rule::unique('pos')->where('tenant_id', $user->tenant_id),
            ],
            'external_po_number' => ['nullable', 'string', 'max:255'],
            'client_name' => ['required', 'string', 'max:255'],
            'global_deadline_relative' => ['nullable', 'string', 'in:3 days,1 week,1 month'],
            'global_deadline' => [
                Rule::requiredIf(! $request->filled('global_deadline_relative')),
                'nullable',
                'date',
            ],
            'is_urgent' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.item_type' => ['required', 'in:MANUFACTURE,BUY_OUT,SERVICE'],
            'items.*.target_qty' => ['required', 'integer', 'min:1'],
            'items.*.required_stages' => ['required', 'array', 'min:1'],
            'items.*.required_stages.*' => ['required', 'string'],
            'items.*.vendor_name' => ['nullable', 'string', 'max:255'],
            'items.*.vendor_phone' => ['nullable', 'string', 'max:255'],
        ]);

        if ($request->filled('global_deadline')) {
            $deadline = Carbon::parse($request->input('global_deadline'));
        } else {
            $relative = $request->input('global_deadline_relative');
            if ($relative === '3 days') {
                $deadline = now()->addDays(3);
            } elseif ($relative === '1 week') {
                $deadline = now()->addWeeks(1);
            } elseif ($relative === '1 month') {
                $deadline = now()->addMonths(1);
            } else {
                $deadline = now()->addDays(3);
            }
        }

        DB::transaction(function () use ($request, $deadline) {
            $po = Po::create([
                'tenant_id' => TenantManager::getTenantId(),
                'po_number' => $request->po_number,
                'external_po_number' => $request->external_po_number,
                'client_name' => $request->client_name,
                'global_deadline' => $deadline->toDateString(),
                'status' => 'PENDING',
                'is_urgent' => (bool) $request->is_urgent,
            ]);

            foreach ($request->items as $itemData) {
                Item::create([
                    'tenant_id' => TenantManager::getTenantId(),
                    'po_id' => $po->id,
                    'item_name' => $itemData['item_name'],
                    'item_type' => $itemData['item_type'],
                    'target_qty' => $itemData['target_qty'],
                    'required_stages' => $itemData['required_stages'],
                    'status' => 'PENDING',
                    'vendor_name' => $itemData['vendor_name'] ?? null,
                    'vendor_phone' => $itemData['vendor_phone'] ?? null,
                ]);
            }
        });

        $tenantSlug = $user->tenant->slug;

        return redirect("/c/{$tenantSlug}")->with('success', 'Purchase Order broadcasted successfully.');
    }

    public function createUser(Request $request)
    {
        // OWNER can only create ADMIN users
        if (auth()->user()->role === 'OWNER') {
            $request->merge(['role' => 'ADMIN', 'login_method' => 'PASSWORD']);
        }

        $loginMethod = $request->input('login_method');
        if (! $loginMethod) {
            if ($request->filled('pin') || in_array(strtoupper($request->role), ['WORKER', 'QC', 'DRAFTER', 'MACHINING', 'FABRICATION', 'DELIVERY'])) {
                $loginMethod = 'PIN';
            } else {
                $loginMethod = 'PASSWORD';
            }
        }
        $request->merge(['login_method' => $loginMethod]);

        $roleRules = ['required', 'string', 'max:255'];
        if (auth()->user()->role === 'OWNER') {
            $roleRules[] = Rule::in(['ADMIN']);
        }

        $request->validate([
            'role' => $roleRules,
            'login_method' => ['required', 'in:PASSWORD,PIN'],
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                Rule::requiredIf($request->login_method === 'PASSWORD'),
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                'unique:users,username',
            ],
            'password' => [
                Rule::requiredIf($request->login_method === 'PASSWORD'),
                'nullable',
                'string',
                'min:6',
            ],
            'pin' => [
                Rule::requiredIf($request->login_method === 'PIN'),
                'nullable',
                'string',
                'size:4',
                'regex:/^[0-9]+$/',
            ],
        ]);

        $userData = [
            'tenant_id' => TenantManager::getTenantId(),
            'name' => $request->name,
            'role' => $request->role,
        ];

        if ($request->login_method === 'PASSWORD') {
            $userData['username'] = $request->username;
            $userData['password'] = bcrypt($request->password);
            $userData['pin'] = null;
        } else {
            $userData['pin'] = bcrypt($request->pin);
            $userData['username'] = null;
            $userData['password'] = null;
        }

        User::create($userData);

        return back()->with('success', 'User created successfully.');
    }

    public function updateUser(Request $request, $userId)
    {
        $user = User::findOrFail($userId);

        $loginMethod = $request->input('login_method');
        if (! $loginMethod) {
            if ($request->filled('pin') || (! $request->filled('username') && $user->pin)) {
                $loginMethod = 'PIN';
            } else {
                $loginMethod = 'PASSWORD';
            }
        }
        $request->merge(['login_method' => $loginMethod]);

        $roleRules = ['required', 'string', 'max:255'];
        if (auth()->user()->role === 'OWNER') {
            $roleRules[] = Rule::in(['ADMIN']);
        }

        $request->validate([
            'role' => $roleRules,
            'login_method' => ['required', 'in:PASSWORD,PIN'],
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                Rule::requiredIf($request->login_method === 'PASSWORD'),
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'password' => [
                'nullable',
                'string',
                'min:6',
            ],
            'pin' => [
                'nullable',
                'string',
                'size:4',
                'regex:/^[0-9]+$/',
            ],
        ]);

        $user->name = $request->name;
        $user->role = $request->role;

        if ($request->login_method === 'PASSWORD') {
            $user->username = $request->username;
            if ($request->filled('password')) {
                $user->password = bcrypt($request->password);
            }
            $user->pin = null;
        } else {
            if ($request->filled('pin')) {
                $user->pin = bcrypt($request->pin);
            }
            $user->username = null;
            $user->password = null;
        }

        $user->save();

        return back()->with('success', 'User updated successfully.');
    }

    public function deleteUser(Request $request, $userId)
    {
        $user = User::findOrFail($userId);

        if ($user->id === auth()->id()) {
            abort(403, 'You cannot delete yourself.');
        }

        $user->delete();

        return back()->with('success', 'User deleted successfully.');
    }

    public function cancelItem(Request $request, $itemId)
    {
        $item = Item::findOrFail($itemId);

        // Business guard: IF Item Progress > 0% -> Returns HTTP 403 Forbidden
        if ((float) $item->progress_percent > 0.00) {
            abort(403, 'Sunk-Cost Cancel Protection: Items with progress > 0% cannot be cancelled. You must terminate midway instead.');
        }

        $item->update(['status' => 'CANCELLED']);

        return back()->with('success', 'Item cancelled successfully.');
    }

    public function terminateMidway(Request $request, $itemId)
    {
        $item = Item::findOrFail($itemId);
        $item->update(['status' => 'TERMINATED']);

        // Freeze worker mobile screens via Pusher/Echo
        broadcast(new ProductionTerminated($item))->toOthers();

        // Calculate completed pieces (average across stages to prevent skewing)
        $stages = $item->itemProgresses()->get();
        $totalCompleted = $stages->sum('completed_qty');
        $stagesCount = $stages->count();
        $completedPieces = $stagesCount > 0 ? (int) round($totalCompleted / $stagesCount) : 0;

        // Dispatch mandatory billing job to Finance
        GenerateSunkCostInvoiceJob::dispatch($item->id, $completedPieces);

        return back()->with('success', 'Production halted. Sunk-cost recovery billing task dispatched.');
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = auth()->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return back()->withErrors([
                'current_password' => 'Current password is incorrect.',
            ]);
        }

        $user->password = bcrypt($request->new_password);
        $user->save();

        return back()->with('success', 'Password changed successfully.');
    }
}
