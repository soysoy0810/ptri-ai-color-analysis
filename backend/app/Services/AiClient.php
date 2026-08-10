<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AiClient
{
    public function analyze(string $image, ?string $sessionId = null): ?array
    {
        $base = rtrim((string) config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001')), '/');

        try {
            $response = Http::timeout(12)
                ->acceptJson()
                ->post($base.'/analyze', [
                    'image' => $image,
                    'session_id' => $sessionId,
                ]);

            if (! $response->successful()) {
                return null;
            }

            return $response->json();
        } catch (\Throwable) {
            return null;
        }
    }
}
