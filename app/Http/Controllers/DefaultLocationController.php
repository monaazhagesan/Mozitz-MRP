<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DefaultLocationController extends Controller
{
    // Frontend field name -> organizations column name.
    private const FIELD_MAP = [
        'default_sales_location' => 'default_sales_location_id',
        'default_manufacturing_location' => 'default_manufacturing_location_id',
        'default_purchases_location' => 'default_purchases_location_id',
    ];

    public function show(Request $request)
    {
        $organization = Organization::findOrFail(auth()->user()->organization_id);

        if (
            !$organization->default_sales_location_id
            && !$organization->default_manufacturing_location_id
            && !$organization->default_purchases_location_id
        ) {
            return response()->json(['message' => 'No default locations set'], 404);
        }

        return response()->json([
            'default_sales_location' => $organization->default_sales_location_id,
            'default_manufacturing_location' => $organization->default_manufacturing_location_id,
            'default_purchases_location' => $organization->default_purchases_location_id,
        ]);
    }

    public function storeOrUpdate(Request $request)
    {
        $data = $request->validate([
            'default_sales_location' => ['sometimes', 'nullable', 'string', Rule::exists('locations', 'id')],
            'default_manufacturing_location' => ['sometimes', 'nullable', 'string', Rule::exists('locations', 'id')],
            'default_purchases_location' => ['sometimes', 'nullable', 'string', Rule::exists('locations', 'id')],
        ]);

        $organization = Organization::findOrFail(auth()->user()->organization_id);

        $updates = [];
        foreach (self::FIELD_MAP as $frontendField => $column) {
            if (array_key_exists($frontendField, $data)) {
                $updates[$column] = $data[$frontendField];
            }
        }

        $organization->update($updates);

        return response()->json([
            'default_sales_location' => $organization->default_sales_location_id,
            'default_manufacturing_location' => $organization->default_manufacturing_location_id,
            'default_purchases_location' => $organization->default_purchases_location_id,
        ]);
    }
}
