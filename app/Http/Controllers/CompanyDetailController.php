<?php

namespace App\Http\Controllers;

use App\Models\CompanyDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CompanyDetailController extends Controller
{

    public function __construct()
    {
        $this->middleware('web');
    }

     public function index()
    {
        $company = CompanyDetail::where('user_id', Auth::id())->first();

        return response()->json($company);
    }

    public function store(Request $request)
{
    $data = $request->validate([
        'name' => 'required|string',
        'email' => 'nullable|email',
        'phone' => 'nullable|string',
        'gstin' => 'nullable|string',
        'pan' => 'nullable|string',
        'address' => 'nullable|string',
        'bank_account_name' => 'nullable|string',
        'bank_account_number' => 'nullable|string',
        'ifsc' => 'nullable|string',
        'account_type' => 'nullable|string',
        'bank_name' => 'nullable|string',
        'branch' => 'nullable|string',
    ]);

    $company = CompanyDetail::where('user_id', Auth::id())->first();

    if ($company) {
        $company->update($data);
    } else {
        $data['user_id'] = Auth::id(); // ✅ IMPORTANT FIX
        $company = CompanyDetail::create($data);
    }

    return response()->json($company);
}
}