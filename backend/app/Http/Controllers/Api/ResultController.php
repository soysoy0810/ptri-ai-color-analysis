<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KioskSession;

class ResultController extends Controller
{
    public function show(string $token)
    {
        $session = KioskSession::query()
            ->where('result_token', $token)
            ->first();

        if (! $session) {
            return response()->json([
                'ok' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Result not found or expired.'],
            ], 404);
        }

        return response()->json([
            'ok' => true,
            'data' => [
                'result' => [
                    'id' => $session->id,
                    'full_name' => $session->full_name,
                    'category_id' => $session->category_id,
                    'design_id' => $session->design_id,
                    'fabric_id' => $session->fabric_id,
                    'background_id' => $session->background_id,
                    'selected_colors' => $session->selected_colors_json,
                    'top20' => $session->top20_json,
                    'result_token' => $session->result_token,
                    'completed_at' => $session->completed_at,
                ],
            ],
        ]);
    }
}
