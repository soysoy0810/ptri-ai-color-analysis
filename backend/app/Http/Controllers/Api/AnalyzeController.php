<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KioskSession;
use App\Services\AiClient;
use Illuminate\Http\Request;

class AnalyzeController extends Controller
{
    public function __construct(private AiClient $ai)
    {
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'session_id' => 'nullable|string',
            'image' => 'required|string',
            'images' => 'nullable|array|max:8',
            'images.*' => 'string',
        ]);

        $ai = $this->ai->analyze(
            $data['image'],
            $data['session_id'] ?? null,
            $data['images'] ?? [],
        );

        if (! $ai || empty($ai['top20'])) {
            // Honest failure: the AI service is the only source of real analysis.
            // No hardcoded/fake substitute — the frontend must show a genuine
            // retry state rather than silently displaying made-up results.
            return response()->json([
                'ok' => false,
                'error' => [
                    'code' => 'ai_service_unavailable',
                    'message' => 'The color analysis service is unavailable. Please try again.',
                ],
            ], 503);
        }

        $result = [
            'session_id' => $data['session_id'] ?? null,
            'face_detected' => (bool) ($ai['face_detected'] ?? true),
            'face_region' => $ai['face_region'] ?? null,
            'lighting' => $ai['lighting'] ?? null,
            'sample_rgb' => $ai['sample_rgb'] ?? null,
            'skin_regions' => $ai['skin_regions'] ?? [],
            'skin_profile' => $ai['skin_profile'] ?? null,
            'top20' => $ai['top20'],
            'model' => $ai['model'] ?? null,
            'source' => 'ai-service',
        ];

        // Privacy: never store raw image.
        if (! empty($data['session_id'])) {
            KioskSession::whereKey($data['session_id'])->update([
                'top20_json' => $result['top20'],
                'analysis_meta_json' => [
                    'source' => $result['source'],
                    'lighting' => $result['lighting'],
                    'model' => $result['model'],
                    'skin_profile' => $result['skin_profile'],
                ],
            ]);
        }

        return response()->json(['ok' => true, 'data' => $result]);
    }
}
