<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KioskSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SessionController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'full_name' => 'nullable|string|max:180',
            'age_range' => 'nullable|string|max:40',
            'gender' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:180',
        ]);

        // Guest session starts at HOME → CAMERA GUIDE (System Guide Section A).
        $session = KioskSession::create([
            'full_name' => $data['full_name'] ?? 'Guest',
            'age_range' => $data['age_range'] ?? null,
            'gender' => $data['gender'] ?? 'prefer_not',
            'email' => $data['email'] ?? null,
            'status' => 'active',
        ]);

        return response()->json([
            'ok' => true,
            'data' => [
                'session_id' => $session->id,
                'session' => $session,
            ],
        ], 201);
    }

    public function complete(Request $request, string $id)
    {
        $session = KioskSession::findOrFail($id);
        $payload = $request->all();

        $session->update([
            'status' => 'completed',
            'selection_mode' => $payload['selection_mode'] ?? null,
            'category_id' => $payload['category_id'] ?? null,
            'design_id' => $payload['design_id'] ?? null,
            'fabric_id' => $payload['fabric_id'] ?? null,
            'background_id' => $payload['background_id'] ?? null,
            'result_token' => $payload['result_token'] ?? ('R'.strtoupper(Str::random(8))),
            'selected_colors_json' => $payload['selected_colors'] ?? [],
            'payload_json' => $payload,
            'completed_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'data' => ['session' => $session->fresh()],
        ]);
    }

    public function email(Request $request, string $id)
    {
        $data = $request->validate([
            'email' => 'required|email|max:180',
        ]);

        KioskSession::findOrFail($id);

        DB::table('email_queue')->insert([
            'session_id' => $id,
            'email' => $data['email'],
            'status' => 'queued',
            'payload_json' => json_encode(['session_id' => $id, 'email' => $data['email']]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'data' => ['queued' => true, 'email' => $data['email']],
        ]);
    }
}
