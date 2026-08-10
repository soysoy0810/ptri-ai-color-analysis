<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function index()
    {
        return response()->json([
            'ok' => true,
            'data' => [
                'palette' => DB::table('colors')->where('is_active', true)->orderBy('sort_order')->get(),
                'categories' => DB::table('categories')->where('is_active', true)->orderBy('sort_order')->get(),
                'fabrics' => DB::table('fabrics')->where('is_active', true)->orderBy('code')->get(),
                'designs' => DB::table('designs')->where('is_active', true)->orderBy('category_id')->get(),
                'backgrounds' => DB::table('backgrounds')->where('is_active', true)->orderBy('sort_order')->get(),
            ],
        ]);
    }
}
