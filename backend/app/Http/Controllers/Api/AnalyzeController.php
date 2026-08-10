<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KioskSession;
use App\Services\AiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

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
        ]);

        $ai = $this->ai->analyze($data['image'], $data['session_id'] ?? null);

        if ($ai && ! empty($ai['top20'])) {
            $result = [
                'session_id' => $data['session_id'] ?? null,
                'face_detected' => (bool) ($ai['face_detected'] ?? true),
                'lighting' => $ai['lighting'] ?? null,
                'sample_rgb' => $ai['sample_rgb'] ?? null,
                'top20' => $ai['top20'],
                'model' => $ai['model'] ?? null,
                'source' => 'ai-service',
            ];
        } else {
            $result = [
                'session_id' => $data['session_id'] ?? null,
                'face_detected' => true,
                'lighting' => ['status' => 'unknown'],
                'sample_rgb' => null,
                'top20' => $this->fallbackTop20(),
                'model' => ['name' => 'laravel-fallback', 'version' => '0.1.0'],
                'source' => 'backend-fallback',
            ];
        }

        // Privacy: never store raw image.
        if (! empty($data['session_id'])) {
            KioskSession::whereKey($data['session_id'])->update([
                'top20_json' => $result['top20'],
                'analysis_meta_json' => [
                    'source' => $result['source'],
                    'lighting' => $result['lighting'],
                    'model' => $result['model'],
                ],
            ]);
        }

        return response()->json(['ok' => true, 'data' => $result]);
    }

    private function fallbackTop20(): array
    {
        $path = base_path('../shared/catalog/palette.json');
        $palette = json_decode(File::get($path), true) ?: [];
        $sample = ['r' => 180, 'g' => 140, 'b' => 120];
        $scored = [];

        foreach ($palette as $color) {
            $rgb = $this->hexToRgb($color['hex']);
            $dist = sqrt(
                ($sample['r'] - $rgb['r']) ** 2 +
                ($sample['g'] - $rgb['g']) ** 2 +
                ($sample['b'] - $rgb['b']) ** 2
            );
            $scored[] = [
                'id' => $color['id'],
                'name' => $color['name'],
                'hex' => $color['hex'],
                'score' => round(max(0, 100 - $dist * 0.35), 1),
                'delta_e' => round($dist, 2),
            ];
        }

        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);

        return $scored;
    }

    private function hexToRgb(string $hex): array
    {
        $h = ltrim($hex, '#');

        return [
            'r' => hexdec(substr($h, 0, 2)),
            'g' => hexdec(substr($h, 2, 2)),
            'b' => hexdec(substr($h, 4, 2)),
        ];
    }
}
