<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\TemporaryPasswordNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Owns user account persistence for the office (Guard A) admin screens.
 *
 * Authorization and validation stay in the controller; this service performs
 * the credential shaping and writes. Behavior is a verbatim move — no rule
 * changes.
 */
class UserManagementService
{
    /**
     * @param  array<string, mixed>  $data  Validated payload including login_method.
     */
    public function create(array $data): User
    {
        $userData = [
            'tenant_id' => TenantManager::getTenantId(),
            'name' => $data['name'],
            'role_id' => $data['role_id'],
            'post_id' => $data['post_id'] ?? null,
        ];

        if (($data['login_method'] ?? null) === 'PASSWORD') {
            $userData['username'] = $data['username'] ?? null;
            $userData['password'] = bcrypt($data['password']);
            $userData['pin'] = null;
        } else {
            $userData['pin'] = bcrypt($data['pin']);
            $userData['username'] = null;
            $userData['password'] = null;
        }

        $user = User::create($userData);

        ActivityLogger::logUserCreated($user);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $data  Validated payload including login_method.
     */
    public function update(User $user, array $data): User
    {
        $user->name = $data['name'];
        $user->role_id = $data['role_id'];
        $user->post_id = $data['post_id'] ?? null;

        if (($data['login_method'] ?? null) === 'PASSWORD') {
            $user->username = $data['username'] ?? null;
            if (! empty($data['password'])) {
                $user->password = bcrypt($data['password']);
            }
            $user->pin = null;
        } else {
            if (! empty($data['pin'])) {
                $user->pin = bcrypt($data['pin']);
            }
            $user->username = null;
            $user->password = null;
        }

        $user->save();

        return $user;
    }

    /**
     * Create the first admin during onboarding and email a temporary password.
     *
     * @return array{user: User, temporary_password: string}
     */
    public function createOnboardingAdmin(string $name, string $email, int $roleId, int $postId): array
    {
        // At least 8 chars and contains a number, matching the password rules.
        $tempPassword = Str::random(10).'1';

        $adminUser = User::create([
            'tenant_id' => TenantManager::getTenantId(),
            'name' => $name,
            'email' => $email,
            'username' => $this->generateUniqueUsername($name),
            'password' => Hash::make($tempPassword),
            'role_id' => $roleId,
            'post_id' => $postId,
            'is_owner' => false,
        ]);

        ActivityLogger::logUserCreated($adminUser);

        try {
            $adminUser->notify(new TemporaryPasswordNotification($tempPassword, $adminUser->email));
        } catch (\Throwable $e) {
            Log::error('Failed to send TemporaryPasswordNotification during onboarding: '.$e->getMessage(), [
                'user_id' => $adminUser->id,
                'email' => $adminUser->email,
            ]);
        }

        return ['user' => $adminUser, 'temporary_password' => $tempPassword];
    }

    public function delete(User $user): void
    {
        $user->delete();
    }

    public function changePassword(User $user, string $newPassword): void
    {
        $user->password = bcrypt($newPassword);
        $user->save();
    }

    public function generateUniqueUsername(string $name): string
    {
        $nameWithoutSpaces = str_replace(' ', '.', strtolower(trim($name)));
        $prefix = preg_replace('/[^a-z0-9\._]/', '', $nameWithoutSpaces);
        if (empty($prefix)) {
            $prefix = 'admin';
        }

        $username = $prefix;
        while (User::where('username', $username)->exists()) {
            $username = $prefix.'_'.Str::random(4);
        }

        return $username;
    }
}
