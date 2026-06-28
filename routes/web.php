<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\OwnerDashboardController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\WorkerAuthController;
use App\Http\Controllers\WorkerDashboardController;
use Illuminate\Support\Facades\Route;

// Redirect home page to login
Route::get('/', function () {
    return redirect('/login');
});

// Guard A: Standard Web Auth (Owner, Drafter, Purchasing, Finance)
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    
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
    Route::post('/pos', [OwnerDashboardController::class, 'createPo']);
    
    // User Management
    Route::post('/users', [OwnerDashboardController::class, 'createUser']);
    Route::post('/users/{userId}/update', [OwnerDashboardController::class, 'updateUser']);
    Route::post('/users/{userId}/delete', [OwnerDashboardController::class, 'deleteUser']);

    // Company Settings Update
    Route::post('/company/update', [OwnerDashboardController::class, 'updateCompany']);
});

// Guard B: Unified Tenant Gateway at c/{slug}
Route::prefix('c/{slug}')->group(function () {
    Route::get('/', [WorkerDashboardController::class, 'index'])->name('worker.dashboard');
    Route::post('/login', [WorkerAuthController::class, 'login']);

    Route::middleware('auth')->group(function () {
        Route::post('/progress/{progressId}/update', [WorkerDashboardController::class, 'updateProgress']);
        Route::post('/progress/{progressId}/kendala', [WorkerDashboardController::class, 'reportKendala']);
        Route::post('/progress/{progressId}/rework', [WorkerDashboardController::class, 'logQcRework']);
    });
});
