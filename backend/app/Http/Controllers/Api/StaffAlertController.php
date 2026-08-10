<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffAlertController extends Controller
{
    public function store(Request $request)
    {
        $sessionId = $request->input('session_id');

        $id = DB::table('staff_alerts')->insertGetId([
            'session_id' => $sessionId,
            'status' => 'open',
            'meta_json' => json_encode(['source' => 'kiosk']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'data' => [
                'alert' => [
                    'id' => $id,
                    'session_id' => $sessionId,
                    'status' => 'open',
                    'created_at' => now()->toIso8601String(),
                ],
            ],
        ], 201);
    }
}
