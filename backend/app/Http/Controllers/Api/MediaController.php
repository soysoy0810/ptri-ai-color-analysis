<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;

class MediaController extends Controller
{
    public function show(string $path)
    {
        $root = realpath(storage_path('app/public'));
        $full = storage_path('app/public/'.str_replace('\\', '/', $path));
        $resolved = realpath($full);

        if (! $root || ! $resolved || ! str_starts_with($resolved, $root) || ! File::isFile($resolved)) {
            return response()->json([
                'ok' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'File not found.'],
            ], 404);
        }

        return response()->file($resolved);
    }
}
