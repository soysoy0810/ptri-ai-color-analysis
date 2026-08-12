<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\DesignMedia;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function index()
    {
        $designs = DB::table('designs')
            ->where('is_active', true)
            ->orderBy('category_id')
            ->get()
            ->map(fn ($row) => $this->enrichDesign($row));

        return response()->json([
            'ok' => true,
            'data' => [
                'palette' => DB::table('colors')->where('is_active', true)->orderBy('sort_order')->get(),
                'categories' => DB::table('categories')->where('is_active', true)->orderBy('sort_order')->get(),
                'fabrics' => DB::table('fabrics')->where('is_active', true)->orderBy('code')->get(),
                'designs' => $designs,
                'backgrounds' => DB::table('backgrounds')->where('is_active', true)->orderBy('sort_order')->get(),
            ],
        ]);
    }

    private function enrichDesign(object $row): object
    {
        $row->preview_url = DesignMedia::url($row->preview_image ?? null);
        $row->tryon_url = DesignMedia::url($row->tryon_image ?? null);

        return $row;
    }
}
