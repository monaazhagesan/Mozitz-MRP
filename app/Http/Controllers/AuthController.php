<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use App\Mail\UserResetPasswordMail;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;


class AuthController extends Controller
{
    // Register
    public function register(Request $request)
{
    $request->validate([
        'email' => 'required|email|unique:users',
        'password' => 'required|min:6',
        'first_name' => 'nullable|string|max:255',
        'last_name' => 'nullable|string|max:255',
        'company' => 'nullable|string|max:255',
        'country' => 'nullable|string|max:100',
        'currency' => 'nullable|string|max:10',
    ]);

    $user = User::create([
        'email' => $request->email,
        'password' => Hash::make($request->password),

        // ✅ NEW FIELDS
        'first_name' => $request->first_name,
        'last_name' => $request->last_name,
        'company' => $request->company,
         'country' => $request->country,
        'currency' => $request->currency,
    ]);

    Auth::login($user);

    return response()->json([
        'user' => $user
    ]);
}
    // Login
    public function login(Request $request)
    {
         $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials'
            ], 401);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => Auth::user()
        ]);
    }


     public function checkSession(Request $request)
    {
        return response()->json([
            'logged_in' => Auth::check(),
            'user' => Auth::user(),
        ]);
    }

    // Logout
    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out'
        ]);
    }

    public function forgotPassword(Request $request)
    {
       $request->validate([
        'email' => 'required|email',
    ]);

        $user = User::where('email', $request->email)->first();

         // ✅ FIX: prevent null crash
    if (!$user) {
        return response()->json([
            'message' => 'Email is not registered'
        ], 404);
    }

         $token = Password::createToken($user);

        Mail::to($user->email)->send(new UserResetPasswordMail($token, $user->email));

        return response()->json([
            'message' => 'Password reset link sent successfully.'
        ]);
    }


     public function showResetForm(Request $request)
    {
        return view('user.reset-password-form', [
            'token' => $request->token,
            'email' => $request->email,
        ]);
    }

    // ✅ Handle form submission and save new password
   public function submitNewPassword(Request $request)
{
    $request->validate([
        'token' => 'required|string',
        'email' => 'required|email|exists:users,email',
        'password' => 'required|string|min:8|confirmed',
    ]);

    $status = Password::broker('users')->reset(
        $request->only('email', 'password', 'password_confirmation', 'token'),
        function ($admin, $password) {
            $admin->password = Hash::make($password);
            $admin->save();
        }
    );

    if ($status === Password::PASSWORD_RESET) {
        // ✅ Return JSON response for React SPA
        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. You can now log in.',
        ]);
    }

    return response()->json([
        'success' => false,
        'message' => 'Invalid token or email.',
    ], 400);
}

    // Get authenticated user
    public function user()
    {
        return response()->json(Auth::user());
    }
}
