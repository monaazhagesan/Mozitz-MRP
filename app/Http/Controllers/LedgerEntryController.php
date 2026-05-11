<?php

namespace App\Http\Controllers;

use App\Models\LedgerEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;


class LedgerEntryController extends Controller
{

    public function __construct()
    {
        $this->middleware('web');
    }

    public function index()
{
    return LedgerEntry::where('user_id', Auth::id())->get();
}

   public function show($id)
{
    return LedgerEntry::where('user_id', Auth::id())
        ->where('id', $id)
        ->firstOrFail();
}

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|string',
            
            'category' => 'nullable|string',
            'company_name' => 'nullable|string',
            'document_type' => 'nullable|string',
            'document_date' => 'nullable|date',
            'document_number' => 'nullable|string',
            'debit' => 'nullable|numeric',
            'credit' => 'nullable|numeric',
        ]);

          // Generate ID if not provided
    if (empty($data['id'])) {
        $data['id'] = (string) Str::uuid();
    }

     $data['user_id'] = Auth::id();

        return LedgerEntry::create($data);
    }

      public function destroy($id)
{
    $entry = LedgerEntry::where('user_id', Auth::id())
        ->where('id', $id)
        ->firstOrFail();

    $entry->delete();

    return response()->json([
        'message' => 'Ledger entry deleted successfully'
    ], 200);
}
}
