#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Team database migrator + seeder.
 * Usage:
 *   php scripts/db_migrate.php
 *   php scripts/db_migrate.php --driver=sqlite
 *   php scripts/db_migrate.php --driver=mysql
 */

$root = dirname(__DIR__);
require $root . '/backend/app/Support/helpers.php';

$driver = 'sqlite';
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--driver=')) {
        $driver = substr($arg, 9);
    }
}

$config = require $root . '/backend/config/config.php';
$config['db']['driver'] = $driver;

echo "PTRI DB migrate — driver={$driver}\n";

$pdo = ptri_db($config, true);

if ($driver === 'mysql') {
    $pdo->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '``', $config['db']['name']) . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $pdo->exec('USE `' . str_replace('`', '``', $config['db']['name']) . '`');
    $sql = file_get_contents($root . '/database/migrations/001_init.sql');
} else {
    $sql = file_get_contents($root . '/database/migrations/001_init.sqlite.sql');
}

foreach (array_filter(array_map('trim', explode(';', (string) $sql))) as $statement) {
    if ($statement !== '') {
        $pdo->exec($statement);
    }
}

echo "Schema applied.\n";

$seed = require $root . '/database/seeds/seed_catalog.php';
$seed($pdo, $root);
echo "Catalog seeded from shared/catalog.\n";
echo "Done.\n";
