<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\OwnerDashboardController;
use App\Http\Controllers\PinResetController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\WorkerAuthController;
use App\Http\Controllers\WorkerDashboardController;
use Illuminate\Support\Facades\Route;

// Redirect home page to login
Route::get('/', function () {
    return redirect('/login');
});

// Guard A: Standard Web Auth
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);

    // Forgot Password
    Route::get('/forgot-password', [ForgotPasswordController::class, 'showForgotForm'])->name('password.request');
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink'])->name('password.email');
    Route::get('/reset-password/{token}', [ForgotPasswordController::class, 'showResetForm'])->name('password.reset');
    Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->name('password.update');

    // Onboarding / Registration
    Route::get('/register', [RegistrationController::class, 'showRegister'])->name('register');
    Route::post('/register', [RegistrationController::class, 'register']);
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Owner Dashboard & Control routes
    Route::get('/dashboard', [OwnerDashboardController::class, 'index'])->name('dashboard');
    Route::post('/items/{itemId}/cancel', [OwnerDashboardController::class, 'cancelItem']);
    Route::post('/items/{itemId}/terminate', [OwnerDashboardController::class, 'terminateMidway']);

    // PO Broadcasting
    Route::get('/pos/create', [OwnerDashboardController::class, 'create'])->name('pos.create');
    Route::post('/pos', [OwnerDashboardController::class, 'createPo']);

    // User Management
    Route::post('/users', [OwnerDashboardController::class, 'createUser']);
    Route::post('/users/{userId}/update', [OwnerDashboardController::class, 'updateUser']);
    Route::post('/users/{userId}/delete', [OwnerDashboardController::class, 'deleteUser']);

    // Company Settings Update
    Route::post('/company/update', [OwnerDashboardController::class, 'updateCompany']);

    // Change Password
    Route::post('/change-password', [OwnerDashboardController::class, 'changePassword']);

    // PIN Reset Approval (admin only)
    Route::post('/pin-reset/{alertId}/approve', [PinResetController::class, 'approvePinReset']);
});

// Guard B: Unified Tenant Gateway at c/{slug}
Route::prefix('c/{slug}')->group(function () {
    Route::get('/', [WorkerDashboardController::class, 'index'])->name('worker.dashboard');
    Route::post('/login', [WorkerAuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/pin-reset/request', [PinResetController::class, 'requestPinReset']);

    Route::middleware('auth')->group(function () {
        Route::get('/export-pdf', [WorkerDashboardController::class, 'exportPdf']);
        Route::get('/profile', [ProfileController::class, 'index']);
        Route::get('/trouble-reports', [WorkerDashboardController::class, 'listTroubles'])->name('worker.troubles');
        Route::post('/progress/{progressId}/update', [WorkerDashboardController::class, 'updateProgress']);
        Route::post('/progress/{progressId}/cancel-last-update', [WorkerDashboardController::class, 'cancelLastUpdate']);
        Route::post('/progress/{progressId}/kendala', [WorkerDashboardController::class, 'reportKendala']);
        Route::post('/progress/{progressId}/rework', [WorkerDashboardController::class, 'logQcRework']);
        Route::post('/items/{itemId}/finance', [WorkerDashboardController::class, 'updateFinanceStatus']);
    });
});
