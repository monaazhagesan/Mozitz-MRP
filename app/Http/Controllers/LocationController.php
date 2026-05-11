<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Str;


class LocationController extends Controller
{
    public function __construct()
    {
        $this->middleware('web');
    }
    public function index()
{
    $locations = Location::orderBy('created_at', 'desc')->get();

    return response()->json([
        'success' => true,
        'data' => $locations
    ]);
}

    public function show($id)
    {
        return Location::findOrFail($id);
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

        return Location::create($data);
    }
}
