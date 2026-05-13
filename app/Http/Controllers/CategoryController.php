<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CategoryController extends Controller
{

   public function __construct()
    {
        $this->middleware('web');
    }
    
     public function index()
    {
        $categories = Category::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($categories);
    }

    // Add a new category
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
        ]);

         $data['user_id'] = auth()->id();


        $category = Category::create($data);

        return response()->json($category, 201);
    }

    // Optional: Get category by ID
    public function show($id)
    {
        $category = Category::where('user_id', auth()->id())
            ->findOrFail($id);

        return response()->json($category);
    }
}