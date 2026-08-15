<?php

namespace App\Http\Middleware;

use App\Models\PlatformAdmin;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    /**
     * Override the root view per-request so superadmin routes resolve against
     * the dedicated `superpowers` blade template instead of `app`.
     */
    public function rootView(Request $request): string
    {
        return $request->is('superpowers', 'superpowers/*')
            ? 'superpowers'
            : $this->rootView;
    }

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            // Must cover every key FlashMessages.tsx renders. This share runs
            // after AppServiceProvider's and overwrites the whole `flash` key,
            // so omitting warning/info here silently drops those toasts.
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
            // Platform admin context — null when not on the platform guard.
            'platformAdmin' => fn () => $this->platformAdmin($request),
        ]);
    }

    protected function platformAdmin(Request $request): ?array
    {
        $user = $request->user('platform');

        if (! $user instanceof PlatformAdmin) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->avatar_url,
            'has_two_factor' => $user->hasTwoFactorEnabled(),
        ];
    }
}
