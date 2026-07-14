<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use App\Mail\UserResetPasswordMail;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;


class AuthController extends Controller
{

public function getProfile()
{
    $user = Auth::user();

    if (!$user) {
        return response()->json([
            'message' => 'Unauthenticated'
        ], 401);
    }

    return response()->json($user);
}
    // Register
    public function register(Request $request)
{
    $request->validate([
        'email' => 'required|email|unique:users',
        'password' => 'required|min:6',
        'first_name' => 'nullable|string|max:255',
        'last_name' => 'nullable|string|max:255',
        'company' => 'nullable|string|max:255',
        'phone' => 'nullable|string|max:20',
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
         'phone' => $request->phone,
         'country' => $request->country,
        'currency' => $request->currency,
    ]);

    // Every login needs an organization for the BelongsToOrganization/
    // OrganizationScope data-sharing model to work — a signup starts as the
    // sole member of a fresh organization, matching how existing users were
    // backfilled (see 2026_07_14_144403_add_organization_id_to_users_table).
    $organization = Organization::create([
        'name' => $request->company ?: (($request->first_name ?: $request->email) . "'s Organization"),
    ]);
    $user->organization_id = $organization->id;
    $user->save();

    Auth::login($user);

    return response()->json([
        'user' => $user
    ]);
}


public function updateProfile(Request $request)
{
    /** @var \App\Models\User $user */
$user = Auth::user();

    if (!$user) {
        return response()->json([
            'message' => 'Unauthenticated user'
        ], 401);
    }

    $request->validate([
        'first_name' => 'nullable|string|max:255',
        'last_name' => 'nullable|string|max:255',
        'company' => 'nullable|string|max:255',
        'country' => 'nullable|string|max:100',
        'currency' => 'nullable|string|max:10',
        'phone' => 'nullable|string|max:20',
        'gstin' => 'nullable|string|max:50',
        'pan' => 'nullable|string|max:50',
        'address' => 'nullable|string|max:255',
        'bank_account_name' => 'nullable|string|max:255',
        'bank_account_number' => 'nullable|string|max:50',
        'ifsc' => 'nullable|string|max:20',
        'account_type' => 'nullable|string|max:50',
        'bank_name' => 'nullable|string|max:255',
        'branch' => 'nullable|string|max:255',
    ]);

     if ($request->filled('password')) {

    // 1. current password required
    if (!$request->filled('current_password')) {
        return response()->json([
            'message' => 'Current password is required'
        ], 422);
    }

    // 2. check current password
    if (!Hash::check($request->current_password, $user->password)) {
        return response()->json([
            'message' => 'Current password is incorrect'
        ], 422);
    }

    // 3. check confirm password match
    if ($request->password !== $request->confirm_password) {
        return response()->json([
            'message' => 'New password and confirm password do not match'
        ], 422);
    }

    // 4. update password
    $user->password = Hash::make($request->password);
}

    $user->update($request->only([
        'first_name',
        'last_name',
        'company',
        'country',
        'currency',
        'phone',
        'gstin',
        'pan',
        'address',
        'bank_account_name',
        'bank_account_number',
        'ifsc',
        'account_type',
        'bank_name',
        'branch',
    ]));

    return response()->json([
        'message' => 'Profile updated successfully',
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
