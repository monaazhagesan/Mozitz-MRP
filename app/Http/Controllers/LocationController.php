<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\Organization;
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
    // Location already carries the BelongsToOrganization global scope, so
    // this only needs the base query — the old manual user_id filter here
    // was redundant and, in a shared organization, overly restrictive
    // (it would hide a teammate's locations from everyone else).
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

         $data['user_id'] = auth()->id();

        return Location::create($data);
    }

    public function update(Request $request, $id)
    {
        $location = Location::findOrFail($id);

        $data = $request->validate([
            'location_name' => 'sometimes|nullable|string',
            'legal_name' => 'sometimes|nullable|string',
            'address' => 'sometimes|nullable|string',
            'sell_enabled' => 'sometimes|boolean',
            'make_enabled' => 'sometimes|boolean',
            'buy_enabled' => 'sometimes|boolean',
        ]);

        $location->update($data);

        return response()->json($location);
    }

    public function destroy($id)
    {
        $location = Location::findOrFail($id);

        // A location referenced as one of the organization's default
        // sales/manufacturing/purchases locations shouldn't disappear out
        // from under those settings.
        $organization = Organization::find(auth()->user()->organization_id);
        $referencedAs = collect([
            'default sales location' => $organization?->default_sales_location_id,
            'default manufacturing location' => $organization?->default_manufacturing_location_id,
            'default purchases location' => $organization?->default_purchases_location_id,
        ])->filter(fn ($locationId) => $locationId === $id)->keys();

        if ($referencedAs->isNotEmpty()) {
            return response()->json([
                'message' => "Cannot delete: this location is set as the {$referencedAs->join(', ')}. Change that setting first.",
            ], 409);
        }

        $location->delete();

        return response()->json(['message' => 'Location deleted successfully']);
    }
}
