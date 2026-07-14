<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;

class OrganizationSettingsController extends Controller
{
    public function show(Request $request)
    {
        $organization = Organization::findOrFail(auth()->user()->organization_id);

        return response()->json($organization);
    }

    public function update(Request $request)
    {
        $organization = Organization::findOrFail(auth()->user()->organization_id);

        $data = $request->validate([
            'warehouse_name' => 'nullable|string|max:255',
            'warehouse_code' => 'nullable|string|max:50',
            'timezone' => 'nullable|string|max:100',
            'low_stock_threshold' => 'nullable|numeric|min:0|max:100',
            'critical_stock_threshold' => 'nullable|numeric|min:0|max:100',
            'low_stock_alerts_enabled' => 'sometimes|boolean',
            'order_updates_enabled' => 'sometimes|boolean',
            'daily_reports_enabled' => 'sometimes|boolean',
        ]);

        $organization->update($data);

        return response()->json($organization);
    }
}
