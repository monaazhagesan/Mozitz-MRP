<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;


class LocationController extends Controller
{
    public function __construct()
    {
        $this->middleware('web');
    }
    public function index()
{
    $locations = Location::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->get();

    return response()->json([
        'success' => true,
        'data' => $locations
    ]);
}

    public function show($id)
    {
        return Location::where('user_id', auth()->id())
            ->findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|string',
            'location_name' => 'nullable|string',
            'legal_name' => 'nullable|string',
            'address' => 'nullable|string',
            'sell_enabled' => 'nullable|boolean',
            'make_enabled' => 'nullable|boolean',
            'buy_enabled' => 'nullable|boolean',
        ]);

         $data['id'] = (string) Str::uuid();

         $data['user_id'] = auth()->id();

        return Location::create($data);
    }
}
