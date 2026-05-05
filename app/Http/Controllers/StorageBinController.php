<?php

namespace App\Http\Controllers;

use App\Models\StorageBin;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StorageBinController extends Controller
{
    public function apiIndex()
{
    try {
        $bins = StorageBin::orderBy('created_at', 'desc')->get();

        return response()->json($bins);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Failed to fetch storage bins',
            'error' => $e->getMessage()
        ], 500);
    }
}

    public function import(Request $request)
    {
        $file = $request->file('csv');

        $rows = file($file);
        foreach ($rows as $row) {
            $cols = explode(';', trim($row));

            StorageBin::create([
                'id'          => $cols[0] ?? Str::uuid(),
                'location_id' => $cols[1] ?? null,
                'bin_name'    => $cols[2] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Imported successfully');
    }
}
