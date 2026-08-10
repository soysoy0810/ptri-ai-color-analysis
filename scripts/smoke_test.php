#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Quick API smoke test for the team.
 */

function call(string $method, string $path, ?array $body = null): array
{
    $_SERVER['REQUEST_METHOD'] = $method;
    $_SERVER['REQUEST_URI'] = '/backend/public' . $path;

    $stdin = '';
    if ($body !== null) {
        $stdin = json_encode($body, JSON_UNESCAPED_SLASHES);
    }

    // Capture output from front controller.
    $php = '/Applications/XAMPP/xamppfiles/bin/php';
    $cmd = sprintf(
        'REQUEST_METHOD=%s REQUEST_URI=%s %s %s',
        escapeshellarg($method),
        escapeshellarg('/backend/public' . $path),
        escapeshellarg($php),
        escapeshellarg(dirname(__DIR__) . '/backend/public/index.php')
    );

    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proc = proc_open($cmd, $descriptors, $pipes, dirname(__DIR__));
    if (!is_resource($proc)) {
        throw new RuntimeException('Unable to start smoke process');
    }
    fwrite($pipes[0], $stdin);
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);

    $json = json_decode((string) $out, true);
    if (!is_array($json)) {
        throw new RuntimeException("Invalid JSON for {$method} {$path}: {$out} {$err}");
    }
    return $json;
}

$health = call('GET', '/api/health');
$catalog = call('GET', '/api/catalog');
$session = call('POST', '/api/sessions', [
    'full_name' => 'Smoke Test',
    'age_range' => '25–34',
    'gender' => 'prefer_not',
    'email' => 'smoke@example.com',
]);

$sessionId = $session['data']['session_id'] ?? null;
echo "health ok=" . (($health['ok'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "catalog colors=" . count($catalog['data']['palette'] ?? []) . PHP_EOL;
echo "session_id=" . ($sessionId ?: 'missing') . PHP_EOL;

if (!($health['ok'] ?? false) || !$sessionId || count($catalog['data']['palette'] ?? []) < 1) {
    fwrite(STDERR, "SMOKE_FAIL\n");
    exit(1);
}

echo "SMOKE_PASS\n";
