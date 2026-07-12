<?php

namespace App\Http\Controllers;

use App\Models\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;


class UserRoleController extends Controller
{
    public function index()
    {
        $roles = UserRole::with('user')->orderBy('created_at', 'desc')->get();
        return response()->json($roles);
    }

    public function import(Request $request)
    {
        $file = $request->file('csv');

        $rows = file($file);
        foreach ($rows as $row) {
            $cols = explode(';', trim($row));

            UserRole::create([
                'id'      => $cols[0] ?? Str::uuid(),
                'user_id' => $cols[1] ?? null,
                'role'    => $cols[2] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Imported successfully');
    }

    public function store(Request $request)
{
    $request->validate([
        'email' => 'required|email|unique:users,email',
        'password' => 'required|min:6',
        'role' => 'required|string'
    ]);

    // Create user
    $user = UserRole::create([
        'email' => $request->email,
        'password' => Hash::make($request->password),
    ]);

    // Assign role (adjust based on your relationship)
    $user->roles()->create([
        'role' => $request->role
    ]);


    return response()->json([
        'message' => 'User created successfully',
        'user' => $user
    ], 201);
}

public function removeRole(Request $request, $userId)
{
    $request->validate([
        'role' => 'required|string'
    ]);

    $user = \App\Models\User::findOrFail($userId);

    $user->roles()->where('role', $request->role)->delete();

    return response()->json([
        'message' => 'Role removed successfully'
    ]);
}
}
