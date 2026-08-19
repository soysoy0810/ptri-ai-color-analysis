<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiClient;
use Illuminate\Http\Request;

class TryOnController extends Controller
{
    public function __construct(private AiClient $ai)
    {
    }

    public function status()
    {
        $status = $this->ai->tryonStatus() ?: $this->ai->tryonRuntime();
        if (! $status) {
            return response()->json([
                'ok' => false,
                'error' => [
                    'code' => 'tryon_service_unreachable',
                    'message' => 'The virtual try-on service is unavailable.',
                ],
            ], 503);
        }

        return response()->json(['ok' => true, 'data' => $status]);
    }

    public function runtime()
    {
        $runtime = $this->ai->tryonRuntime();
        if (! $runtime) {
            return response()->json([
                'ok' => false,
                'error' => [
                    'code' => 'tryon_service_unreachable',
                    'message' => 'The virtual try-on service is unavailable.',
                ],
            ], 503);
        }

        return response()->json(['ok' => true, 'data' => $runtime]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'person_image' => 'required|string',
            'garment_image' => 'required|string',
            'category' => 'nullable|string|in:upper_body,lower_body,dresses',
            'garment_description' => 'nullable|string|max:200',
            'fabric_hex' => 'nullable|string|max:16',
            'textile_name' => 'nullable|string|max:80',
            'textile_image' => 'nullable|string',
            'accessories' => 'nullable|array',
            'accessories.*' => 'string|max:80',
            'background_id' => 'nullable|string|max:40',
            'view' => 'nullable|string|in:half,full',
            'lighting' => 'nullable|string|in:warm,neutral,cool',
        ]);

        $result = $this->ai->tryon($data);

        if (! $result) {
            return response()->json([
                'ok' => false,
                'error' => [
                    'code' => 'tryon_service_unreachable',
                    'message' => 'The virtual try-on service is unavailable.',
                ],
            ], 503);
        }

        // The AI service reports its own honest status (e.g. model not
        // configured, generation failed). Pass it through verbatim rather
        // than substituting any placeholder image.
        if (empty($result['ok'])) {
            return response()->json([
                'ok' => false,
                'error' => [
                    'code' => $result['status'] ?? 'tryon_failed',
                    'message' => $result['message'] ?? 'Try-on generation failed.',
                ],
                'diagnostics' => $result['diagnostics'] ?? null,
            ], 503);
        }

        return response()->json(['ok' => true, 'data' => $result]);
    }
}
