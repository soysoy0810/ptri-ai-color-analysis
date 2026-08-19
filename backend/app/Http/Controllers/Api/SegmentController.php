<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiClient;
use Illuminate\Http\Request;

class SegmentController extends Controller
{
    public function __construct(private AiClient $ai)
    {
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'image' => 'required|string',
        ]);

        $result = $this->ai->segment($data['image']);

        if (! $result || empty($result['segmented'])) {
            // Honest failure: no fallback mask is generated. A guessed
            // silhouette would produce a visibly wrong composite, so the
            // frontend should show the real photo without background
            // replacement rather than a fake cutout.
            return response()->json([
                'ok' => false,
                'error' => [
                    'code' => 'segmentation_unavailable',
                    'message' => 'Background segmentation is unavailable right now.',
                ],
            ], 503);
        }

        return response()->json(['ok' => true, 'data' => $result]);
    }
}
