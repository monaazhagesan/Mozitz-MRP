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
            'barcode_type' => 'sometimes|string|in:code128,code39,ean13,ean8,upc,qrcode',
            'barcode_width' => 'sometimes|integer|min:1|max:500',
            'barcode_height' => 'sometimes|integer|min:1|max:500',
            'barcode_label_size' => 'sometimes|string|in:small,standard,large,custom',
            'barcode_show_item_code' => 'sometimes|boolean',
            'barcode_show_item_name' => 'sometimes|boolean',
            'barcode_show_location' => 'sometimes|boolean',
            'barcode_prefix' => 'nullable|string|max:20',
            'barcode_suffix' => 'nullable|string|max:20',
            'barcode_starting_number' => 'sometimes|integer|min:0',
            'barcode_number_length' => 'sometimes|integer|min:4|max:12',
            'barcode_printer_type' => 'sometimes|string|in:thermal,inkjet,laser',
            'barcode_labels_per_row' => 'sometimes|integer|min:1|max:5',
            'barcode_page_size' => 'sometimes|string|in:a4,letter,roll',
            'barcode_margin' => 'sometimes|integer|min:0|max:50',
            'barcode_auto_print_on_creation' => 'sometimes|boolean',
            'barcode_camera_scanning_enabled' => 'sometimes|boolean',
            'barcode_beep_on_scan' => 'sometimes|boolean',
            'barcode_vibrate_on_scan' => 'sometimes|boolean',
            'barcode_auto_redirect_on_scan' => 'sometimes|boolean',
        ]);

        $organization->update($data);

        return response()->json($organization);
    }
}
