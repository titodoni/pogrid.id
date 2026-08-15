<?php

use App\Http\Controllers\Superpowers\Auth\LoginController;
use App\Http\Controllers\Superpowers\Auth\TwoFactorController;
use App\Http\Controllers\Superpowers\DashboardController;
use App\Http\Controllers\Superpowers\EmailLogController;
use App\Http\Controllers\Superpowers\HealthController;
use App\Http\Controllers\Superpowers\LogController;
use App\Http\Controllers\Superpowers\PaymentMethodController;
use App\Http\Controllers\Superpowers\SettingsController;
use App\Http\Controllers\Superpowers\SubscriptionController;
use App\Http\Controllers\Superpowers\SubscriptionInvoiceController;
use App\Http\Controllers\Superpowers\TenantController;
use Illuminate\Support\Facades\Route;

Route::prefix('superpowers')->name('superpowers.')->group(function () {
    // Guest routes (not logged in as platform admin)
    Route::middleware('platform.guest')->group(function () {
        Route::get('login', [LoginController::class, 'showLogin'])->name('login');
        Route::post('login', [LoginController::class, 'login'])->middleware('throttle:login-platform');
    });

    // 2FA challenge — password already verified (platform.auth) but the 2FA
    // gate (platform.2fa) is deliberately absent to avoid a redirect loop.
    Route::middleware('platform.auth')->group(function () {
        Route::get('2fa/challenge', [TwoFactorController::class, 'showChallenge'])->name('2fa.challenge');
        Route::post('2fa/challenge', [TwoFactorController::class, 'verify'])->middleware('throttle:login-platform')->name('2fa.verify');
        Route::post('2fa/recovery', [TwoFactorController::class, 'useRecoveryCode'])->middleware('throttle:login-platform')->name('2fa.recovery');
    });

    // Authenticated + 2FA verified routes
    Route::middleware(['platform.auth', 'platform.2fa'])->group(function () {
        Route::post('logout', [LoginController::class, 'logout'])->name('logout');
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

        // Tenant management. `withTrashed()` on the resource so soft-deleted
        // tenants remain inspectable/editable/restorable instead of 404-ing.
        Route::resource('tenants', TenantController::class)->withTrashed(['show', 'edit', 'update', 'destroy']);
        Route::post('tenants/{tenant}/suspend', [TenantController::class, 'suspend'])->name('tenants.suspend');
        Route::post('tenants/{tenant}/activate', [TenantController::class, 'activate'])->name('tenants.activate');
        Route::post('tenants/{tenant}/restore', [TenantController::class, 'restore'])->name('tenants.restore')->withTrashed();

        // Subscriptions, Invoices & Payment Methods
        Route::get('subscriptions', [SubscriptionController::class, 'index'])->name('subscriptions');
        Route::get('subscriptions/invoices', [SubscriptionInvoiceController::class, 'index'])->name('invoices.index');
        Route::post('subscriptions/invoices', [SubscriptionInvoiceController::class, 'store'])->name('invoices.store');
        Route::post('subscriptions/invoices/{invoice}/send-email', [SubscriptionInvoiceController::class, 'sendEmail'])->name('invoices.send-email');
        Route::post('subscriptions/invoices/{invoice}/approve', [SubscriptionInvoiceController::class, 'approve'])->name('invoices.approve');
        Route::post('subscriptions/invoices/{invoice}/quick-extend', [SubscriptionInvoiceController::class, 'quickExtend'])->name('invoices.quick-extend');
        Route::post('subscriptions/invoices/{invoice}/cancel', [SubscriptionInvoiceController::class, 'cancel'])->name('invoices.cancel');
        Route::post('tenants/{tenant}/direct-extend', [SubscriptionInvoiceController::class, 'directExtendTenant'])->name('tenants.direct-extend');

        Route::get('subscriptions/payment-methods', [PaymentMethodController::class, 'index'])->name('payment-methods.index');
        Route::post('subscriptions/payment-methods', [PaymentMethodController::class, 'store'])->name('payment-methods.store');
        Route::put('subscriptions/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update'])->name('payment-methods.update');
        Route::delete('subscriptions/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy'])->name('payment-methods.destroy');

        // System health
        Route::get('health', [HealthController::class, 'index'])->name('health');
        Route::post('health/backup', [HealthController::class, 'triggerBackup'])->name('health.backup');

        // Error logs
        Route::get('logs', [LogController::class, 'index'])->name('logs');

        // Email delivery logs
        Route::get('emails', [EmailLogController::class, 'index'])->name('emails');

        // Platform settings
        Route::get('settings', [SettingsController::class, 'index'])->name('settings');
        Route::post('settings/maintenance', [SettingsController::class, 'toggleMaintenance'])->name('settings.maintenance');
        Route::post('settings/message', [SettingsController::class, 'updateMaintenanceMessage'])->name('settings.message');
    });
});
