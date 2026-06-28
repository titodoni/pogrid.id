<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\OwnerDashboardController;
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
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    
    // Owner Dashboard & Control routes
    Route::get('/dashboard', [OwnerDashboardController::class, 'index'])->name('dashboard');
    Route::post('/items/{itemId}/cancel', [OwnerDashboardController::class, 'cancelItem']);
    Route::post('/items/{itemId}/terminate', [OwnerDashboardController::class, 'terminateMidway']);
    Route::post('/delivery-orders', [OwnerDashboardController::class, 'createDeliveryOrder']);
    Route::post('/invoices', [OwnerDashboardController::class, 'createInvoice']);
    Route::get('/invoices/{invoiceId}/pdf', [OwnerDashboardController::class, 'downloadInvoicePdf']);
});

// Guard B: Worker / QC Path-Based Auth
Route::prefix('c/{slug}')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::get('/', [WorkerAuthController::class, 'showLogin'])->name('worker.login');
        Route::post('/login', [WorkerAuthController::class, 'login']);
    });

    Route::middleware('auth')->group(function () {
        Route::get('/dashboard', [WorkerDashboardController::class, 'index'])->name('worker.dashboard');
        Route::post('/progress/{progressId}/update', [WorkerDashboardController::class, 'updateProgress']);
        Route::post('/progress/{progressId}/kendala', [WorkerDashboardController::class, 'reportKendala']);
        Route::post('/progress/{progressId}/rework', [WorkerDashboardController::class, 'logQcRework']);
    });
});
