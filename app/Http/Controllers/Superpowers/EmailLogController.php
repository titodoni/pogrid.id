<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use App\Models\EmailLog;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailLogController extends Controller
{
    public function index(Request $request)
    {
        $logs = TenantManager::runWithoutScope(function () use ($request) {
            $query = EmailLog::query()->with('tenant:id,company_name');

            if ($request->filled('status')) {
                // Cast to a real string: `Stringable` never matches under
                // in_array()'s strict comparison, which silently disabled
                // this filter entirely.
                $status = $request->string('status')->lower()->toString();
                if (in_array($status, [EmailLog::STATUS_QUEUED, EmailLog::STATUS_SENT, EmailLog::STATUS_FAILED], true)) {
                    $query->where('status', $status);
                }
            }

            if ($request->filled('search')) {
                $search = $request->string('search')->trim();
                $query->where(function ($q) use ($search) {
                    $q->where('to', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%");
                });
            }

            return $query->orderByDesc('id')
                ->paginate(25)
                ->through(fn ($log) => [
                    'id' => $log->id,
                    'tenant_id' => $log->tenant_id,
                    'tenant_name' => $log->tenant?->company_name,
                    'from' => $log->from,
                    'to' => $log->to,
                    'subject' => $log->subject,
                    'status' => $log->status,
                    'error' => $log->error,
                    'created_at' => $log->created_at?->toIso8601String(),
                    'sent_at' => $log->sent_at?->toIso8601String(),
                ]);
        });

        $stats = TenantManager::runWithoutScope(function () {
            return [
                'queued' => EmailLog::where('status', EmailLog::STATUS_QUEUED)->count(),
                'sent' => EmailLog::where('status', EmailLog::STATUS_SENT)->count(),
                'failed' => EmailLog::where('status', EmailLog::STATUS_FAILED)->count(),
                'sent_24h' => EmailLog::where('status', EmailLog::STATUS_SENT)
                    ->where('created_at', '>=', now()->subDay())->count(),
                'failed_24h' => EmailLog::where('status', EmailLog::STATUS_FAILED)
                    ->where('created_at', '>=', now()->subDay())->count(),
            ];
        });

        return Inertia::render('Superpowers/Emails/Index', [
            'logs' => $logs,
            'stats' => $stats,
            'filters' => $request->only(['status', 'search']),
        ]);
    }
}
