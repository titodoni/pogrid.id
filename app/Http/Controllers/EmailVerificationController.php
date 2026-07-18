<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailVerificationController extends Controller
{
    /**
     * Display the email verification notice.
     */
    public function showNotice(Request $request)
    {
        return $request->user()->hasVerifiedEmail()
            ? redirect('/selamat-datang')
            : Inertia::render('Auth/VerifyEmail', [
                'status' => session('status'),
            ]);
    }

    /**
     * Mark the authenticated user's email address as verified.
     */
    public function verify(EmailVerificationRequest $request)
    {
        $request->fulfill();

        return redirect('/selamat-datang')->with('success', 'Email verified successfully!');
    }

    /**
     * Resend the email verification notification.
     */
    public function resend(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect('/selamat-datang');
        }

        $request->user()->sendEmailVerificationNotification();

        return back()->with('status', 'verification-link-sent');
    }
}
