<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AiClient
{
    public function analyze(string $image, ?string $sessionId = null, array $images = []): ?array
    {
        $base = rtrim((string) config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001')), '/');

        try {
            $payload = [
                'image' => $image,
                'session_id' => $sessionId,
            ];
            if ($images) {
                $payload['images'] = array_values($images);
            }

            $response = Http::timeout(60)
                ->acceptJson()
                ->post($base.'/analyze', $payload);

            if (! $response->successful()) {
                \Log::error('AI /analyze returned non-2xx', [
                    'status' => $response->status(),
                    'body' => mb_substr((string) $response->body(), 0, 400),
                ]);

                return null;
            }

            return $response->json();
        } catch (\Throwable $e) {
            \Log::error('AI /analyze unreachable', [
                'url' => $base.'/analyze',
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function tryonStatus(): ?array
    {
        $base = rtrim((string) config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001')), '/');

        try {
            $response = Http::timeout(5)->acceptJson()->get($base.'/tryon/status');
            if (! $response->successful()) {
                return null;
            }

            $payload = $response->json();

            return is_array($payload['data'] ?? null) ? $payload['data'] : $payload;
        } catch (\Throwable) {
            return null;
        }
    }

    /** What the AI host can actually run — used to fail honestly, not guess. */
    public function tryonRuntime(): ?array
    {
        $base = rtrim((string) config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001')), '/');

        try {
            $response = Http::timeout(5)->acceptJson()->get($base.'/tryon/runtime');
            if (! $response->successful()) {
                return null;
            }

            $payload = $response->json();

            return is_array($payload['data'] ?? null) ? $payload['data'] : $payload;
        } catch (\Throwable) {
            return null;
        }
    }

    /** Generative virtual try-on — slow by design (diffusion model, ~10-30s). */
    public function tryon(array $payload): ?array
    {
        $base = rtrim((string) config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001')), '/');

        try {
            $response = Http::timeout(130)
                ->acceptJson()
                ->post($base.'/tryon', $payload);

            if (! $response->successful()) {
                $payload = $response->json();
                if (is_array($payload) && (isset($payload['message']) || isset($payload['ok']))) {
                    return $payload;
                }
                \Log::error('AI /tryon returned non-2xx', [
                    'status' => $response->status(),
                    'body' => mb_substr((string) $response->body(), 0, 500),
                ]);

                return null;
            }

            return $response->json();
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            // A timeout and a refused connection are different problems: the
            // first means the free GPU queue is slow, the second means the AI
            // service isn't running. Reporting both as "unavailable" sent us
            // hunting the wrong fault, so keep them distinct.
            $timedOut = str_contains(strtolower($e->getMessage()), 'timed out')
                || str_contains(strtolower($e->getMessage()), 'timeout');

            return [
                'ok' => false,
                'status' => $timedOut ? 'tryon_timeout' : 'tryon_service_unreachable',
                'message' => $timedOut
                    ? 'The free try-on service is busy right now. Please tap Try Again.'
                    : 'The virtual try-on service is not running.',
            ];
        } catch (\Throwable $e) {
            // Swallowing this silently is what made the kiosk show a generic
            // "unavailable" card with no way to tell what actually broke.
            \Log::error('AI /tryon threw', [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function segment(string $image): ?array
    {
        $base = rtrim((string) config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001')), '/');

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->post($base.'/segment', [
                    'image' => $image,
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
