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

        $sessions = DB::table('kiosk_sessions as s')
            ->leftJoin('designs as d', 'd.id', '=', 's.design_id')
            ->leftJoin('fabrics as f', 'f.id', '=', 's.fabric_id')
            ->leftJoin('categories as c', 'c.id', '=', 's.category_id')
            ->orderByDesc('s.created_at')
            ->limit(200)
            ->get([
                's.id', 's.full_name', 's.age_range', 's.gender', 's.email', 's.status',
                's.category_id', 'c.label as category_label',
                's.design_id', 'd.name as design_name',
                's.fabric_id', 'f.name as fabric_name', 'f.code as fabric_code',
                's.background_id', 's.selection_mode', 's.result_token',
                's.selected_colors_json', 's.top20_json',
                's.completed_at', 's.created_at',
            ]);

        $emailRows = DB::table('email_queue')
            ->whereIn('session_id', $sessions->pluck('id'))
            ->orderByDesc('created_at')
            ->get(['session_id', 'email', 'status', 'sent_at', 'created_at']);

        $emailsBySession = $emailRows->groupBy('session_id');

        $data = $sessions->map(function ($s) use ($emailsBySession) {
            $row = (array) $s;
            $row['emails_sent'] = ($emailsBySession[$s->id] ?? collect())->values()->all();
            $row['email_count'] = count($row['emails_sent']);
            return $row;
        });

        return response()->json(['ok' => true, 'data' => $data]);
    }

    public function emails(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $rows = DB::table('email_queue as e')
            ->leftJoin('kiosk_sessions as s', 's.id', '=', 'e.session_id')
            ->orderByDesc('e.created_at')
            ->limit(200)
            ->get([
                'e.id', 'e.session_id', 'e.email', 'e.status', 'e.sent_at', 'e.created_at',
                's.full_name', 's.gender', 's.age_range',
            ]);

        return response()->json(['ok' => true, 'data' => $rows]);
    }

    public function fabrics(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        return response()->json([
            'ok' => true,
            'data' => DB::table('fabrics')->orderBy('code')->get(),
        ]);
    }

    public function storeFabric(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $data = $request->validate([
            'code' => 'required|string|max:40',
            'name' => 'required|string|max:180',
            'hex' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'base_match' => 'nullable|integer|min:0|max:100',
        ]);

        $id = 'f' . (DB::table('fabrics')->count() + 1) . '-' . substr(md5(uniqid()), 0, 4);
        DB::table('fabrics')->insert([
            'id' => $id,
            'code' => $data['code'],
            'name' => $data['name'],
            'hex' => strtoupper($data['hex']),
            'base_match' => $data['base_match'] ?? 80,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->audit($request, 'fabric_created', ['id' => $id]);

        return response()->json(['ok' => true, 'data' => DB::table('fabrics')->find($id)]);
    }

    public function updateFabric(Request $request, string $id)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $data = $request->validate([
            'code' => 'sometimes|string|max:40',
            'name' => 'sometimes|string|max:180',
            'hex' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'base_match' => 'sometimes|integer|min:0|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($data['hex'])) {
            $data['hex'] = strtoupper($data['hex']);
        }
        $data['updated_at'] = now();

        if (!DB::table('fabrics')->where('id', $id)->update($data)) {
            return response()->json([
                'ok' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Fabric not found.'],
            ], 404);
        }

        $this->audit($request, 'fabric_updated', ['id' => $id] + $data);

        return response()->json(['ok' => true, 'data' => DB::table('fabrics')->find($id)]);
    }

    public function deleteFabric(Request $request, string $id)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        DB::table('fabrics')->where('id', $id)->delete();
        $this->audit($request, 'fabric_deleted', ['id' => $id]);

        return response()->json(['ok' => true, 'data' => ['id' => $id]]);
    }

    public function designs(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $designs = DB::table('designs as d')
            ->leftJoin('categories as c', 'c.id', '=', 'd.category_id')
            ->orderBy('c.sort_order')
            ->orderBy('d.name')
            ->get(['d.*', 'c.label as category_label']);

        return response()->json(['ok' => true, 'data' => $designs]);
    }

    public function categories(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        return response()->json([
            'ok' => true,
            'data' => DB::table('categories')->where('is_active', true)->orderBy('sort_order')->get(),
        ]);
    }

    public function storeDesign(Request $request)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $data = $request->validate([
            'category_id' => 'required|string|max:40|exists:categories,id',
            'name' => 'required|string|max:180',
            'style_code' => 'nullable|string|max:20',
        ]);

        $id = 'd' . (DB::table('designs')->count() + 1) . '-' . substr(md5(uniqid()), 0, 4);
        DB::table('designs')->insert([
            'id' => $id,
            'category_id' => $data['category_id'],
            'name' => $data['name'],
            'style_code' => $data['style_code'] ?? null,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->audit($request, 'design_created', ['id' => $id, 'name' => $data['name']]);

        return response()->json(['ok' => true, 'data' => DB::table('designs')->find($id)]);
    }

    public function updateDesign(Request $request, string $id)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        $data = $request->validate([
            'category_id' => 'sometimes|string|max:40|exists:categories,id',
            'name' => 'sometimes|string|max:180',
            'style_code' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $data['updated_at'] = now();

        if (!DB::table('designs')->where('id', $id)->update($data)) {
            return response()->json([
                'ok' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Design not found.'],
            ], 404);
        }

        $this->audit($request, 'design_updated', ['id' => $id] + $data);

        return response()->json(['ok' => true, 'data' => DB::table('designs')->find($id)]);
    }

    public function deleteDesign(Request $request, string $id)
    {
        if ($err = $this->requireAuth($request)) {
            return $err;
        }

        DB::table('designs')->where('id', $id)->delete();
        $this->audit($request, 'design_deleted', ['id' => $id]);

        return response()->json(['ok' => true, 'data' => ['id' => $id]]);
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
