<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Admin panel API: login + dashboard stats + palette management.
 * Auth is a stateless HMAC token derived from the app key.
 */
class AdminController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = DB::table('users')->where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json([
                'ok' => false,
                'error' => ['code' => 'AUTH', 'message' => 'Invalid email or password.'],
            ], 401);
        }

        DB::table('audit_logs')->insert([
            'actor' => $user->email,
            'action' => 'admin_login',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'data' => [
                'token' => self::makeToken($user->id, $user->password),
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function stats(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        return response()->json([
            'ok' => true,
            'data' => [
                'sessions_total' => DB::table('kiosk_sessions')->count(),
                'sessions_today' => DB::table('kiosk_sessions')->whereDate('created_at', today())->count(),
                'sessions_completed' => DB::table('kiosk_sessions')->whereNotNull('completed_at')->count(),
                'staff_alerts_open' => DB::table('staff_alerts')->where('status', 'open')->count(),
                'emails_queued' => DB::table('email_queue')->where('status', 'queued')->count(),
                'colors_active' => DB::table('colors')->where('is_active', true)->count(),
                'fabrics_active' => DB::table('fabrics')->where('is_active', true)->count(),
                'designs_active' => DB::table('designs')->where('is_active', true)->count(),
            ],
        ]);
    }

    public function sessions(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $sessions = DB::table('kiosk_sessions')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get([
                'id', 'full_name', 'age_range', 'gender', 'email', 'status',
                'category_id', 'design_id', 'fabric_id', 'result_token',
                'completed_at', 'created_at',
            ]);

        return response()->json(['ok' => true, 'data' => $sessions]);
    }

    public function colors(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        return response()->json([
            'ok' => true,
            'data' => DB::table('colors')->orderBy('sort_order')->get(),
        ]);
    }

    public function storeColor(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $data = $request->validate([
            'name' => 'required|string|max:120',
            'hex' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $id = 'c' . (int) (DB::table('colors')->count() + 1) . '-' . substr(md5(uniqid()), 0, 4);
        DB::table('colors')->insert([
            'id' => $id,
            'name' => $data['name'],
            'hex' => strtoupper($data['hex']),
            'sort_order' => $data['sort_order'] ?? (DB::table('colors')->max('sort_order') + 1),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->audit($request, 'color_created', ['id' => $id, 'name' => $data['name']]);

        return response()->json(['ok' => true, 'data' => DB::table('colors')->find($id)]);
    }

    public function updateColor(Request $request, string $id)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'hex' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'sort_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($data['hex'])) {
            $data['hex'] = strtoupper($data['hex']);
        }
        $data['updated_at'] = now();

        $updated = DB::table('colors')->where('id', $id)->update($data);
        if (!$updated) {
            return response()->json([
                'ok' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Color not found.'],
            ], 404);
        }

        $this->audit($request, 'color_updated', ['id' => $id] + $data);

        return response()->json(['ok' => true, 'data' => DB::table('colors')->find($id)]);
    }

    public function deleteColor(Request $request, string $id)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        DB::table('colors')->where('id', $id)->delete();
        $this->audit($request, 'color_deleted', ['id' => $id]);

        return response()->json(['ok' => true, 'data' => ['id' => $id]]);
    }

    /* ---------------- token helpers ---------------- */

    private static function makeToken(int $userId, string $passwordHash): string
    {
        $sig = hash_hmac('sha256', $userId . '|' . $passwordHash, config('app.key'));
        return base64_encode($userId . '|' . $sig);
    }

    private function requireAuth(Request $request)
    {
        $token = $request->bearerToken();
        if ($token) {
            $decoded = base64_decode($token, true);
            if ($decoded && str_contains($decoded, '|')) {
                [$userId, $sig] = explode('|', $decoded, 2);
                $user = DB::table('users')->find((int) $userId);
                if ($user) {
                    $expected = hash_hmac('sha256', $user->id . '|' . $user->password, config('app.key'));
                    if (hash_equals($expected, $sig)) {
                        $request->attributes->set('admin_email', $user->email);
                        return null;
                    }
                }
            }
        }

        return response()->json([
            'ok' => false,
            'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Please sign in again.'],
        ], 401);
    }

    private function audit(Request $request, string $action, array $meta = []): void
    {
        DB::table('audit_logs')->insert([
            'actor' => $request->attributes->get('admin_email', 'admin'),
            'action' => $action,
            'meta_json' => json_encode($meta),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
