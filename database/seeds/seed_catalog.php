<?php

declare(strict_types=1);

return static function (PDO $pdo, string $root): void {
    $load = static function (string $file) use ($root): array {
        $path = $root . '/shared/catalog/' . $file;
        $data = json_decode((string) file_get_contents($path), true);
        if (!is_array($data)) {
            throw new RuntimeException("Invalid catalog file: {$file}");
        }
        return $data;
    };

    $pdo->exec('DELETE FROM designs');
    $pdo->exec('DELETE FROM backgrounds');
    $pdo->exec('DELETE FROM fabrics');
    $pdo->exec('DELETE FROM categories');
    $pdo->exec('DELETE FROM colors');

    $stmt = $pdo->prepare(
        'INSERT INTO colors (id, name, hex, sort_order, is_active) VALUES (:id, :name, :hex, :sort_order, 1)'
    );
    foreach ($load('palette.json') as $row) {
        $stmt->execute([
            ':id' => $row['id'],
            ':name' => $row['name'],
            ':hex' => $row['hex'],
            ':sort_order' => $row['sort_order'] ?? 0,
        ]);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO categories (id, label, description, sort_order, is_active) VALUES (:id, :label, :description, :sort_order, 1)'
    );
    foreach ($load('categories.json') as $row) {
        $stmt->execute([
            ':id' => $row['id'],
            ':label' => $row['label'],
            ':description' => $row['description'] ?? null,
            ':sort_order' => $row['sort_order'] ?? 0,
        ]);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO fabrics (id, code, name, hex, base_match, is_active) VALUES (:id, :code, :name, :hex, :base_match, 1)'
    );
    foreach ($load('fabrics.json') as $row) {
        $stmt->execute([
            ':id' => $row['id'],
            ':code' => $row['code'],
            ':name' => $row['name'],
            ':hex' => $row['hex'],
            ':base_match' => $row['base_match'] ?? 80,
        ]);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO designs (id, category_id, name, style_code, is_active) VALUES (:id, :category_id, :name, :style_code, 1)'
    );
    foreach ($load('designs.json') as $row) {
        $stmt->execute([
            ':id' => $row['id'],
            ':category_id' => $row['category_id'],
            ':name' => $row['name'],
            ':style_code' => $row['style_code'] ?? null,
        ]);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO backgrounds (id, label, tone, sort_order, is_active) VALUES (:id, :label, :tone, :sort_order, 1)'
    );
    foreach ($load('backgrounds.json') as $row) {
        $stmt->execute([
            ':id' => $row['id'],
            ':label' => $row['label'],
            ':tone' => $row['tone'] ?? null,
            ':sort_order' => $row['sort_order'] ?? 0,
        ]);
    }
};
