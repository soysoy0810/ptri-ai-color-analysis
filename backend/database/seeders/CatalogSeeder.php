<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $root = base_path('../shared/catalog');

        DB::table('designs')->delete();
        DB::table('backgrounds')->delete();
        DB::table('fabrics')->delete();
        DB::table('categories')->delete();
        DB::table('colors')->delete();

        foreach ($this->load($root.'/palette.json') as $row) {
            DB::table('colors')->insert([
                'id' => $row['id'],
                'name' => $row['name'],
                'hex' => $row['hex'],
                'sort_order' => $row['sort_order'] ?? 0,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ($this->load($root.'/categories.json') as $row) {
            DB::table('categories')->insert([
                'id' => $row['id'],
                'label' => $row['label'],
                'description' => $row['description'] ?? null,
                'sort_order' => $row['sort_order'] ?? 0,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ($this->load($root.'/fabrics.json') as $row) {
            DB::table('fabrics')->insert([
                'id' => $row['id'],
                'code' => $row['code'],
                'name' => $row['name'],
                'hex' => $row['hex'],
                'base_match' => $row['base_match'] ?? 80,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ($this->load($root.'/designs.json') as $row) {
            DB::table('designs')->insert([
                'id' => $row['id'],
                'category_id' => $row['category_id'],
                'name' => $row['name'],
                'style_code' => $row['style_code'] ?? null,
                'garment_type' => self::GARMENT_MAP[$row['id']] ?? 'polo',
                'audience' => $row['audience'] ?? 'unisex',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ($this->load($root.'/backgrounds.json') as $row) {
            DB::table('backgrounds')->insert([
                'id' => $row['id'],
                'label' => $row['label'],
                'tone' => $row['tone'] ?? null,
                'sort_order' => $row['sort_order'] ?? 0,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function load(string $path): array
    {
        return json_decode(File::get($path), true) ?: [];
    }

    /** Default try-on garment shape per bundled design id */
    private const GARMENT_MAP = [
        'fp1' => 'barong',
        'fp2' => 'terno',
        'fp3' => 'filipiniana-blouse',
        'fp4' => 'terno',
        'u1' => 'polo',
        'u2' => 'barong',
        'u3' => 'collar-blouse',
        'u4' => 'polo',
        'ca1' => 'active-tee',
        'ca2' => 'linen-shirt',
        'ca3' => 'collar-blouse',
        'ca4' => 'polo',
        'sc1' => 'formal-shirt',
        'sc2' => 'polo',
        'sc3' => 'linen-shirt',
        'sc4' => 'collar-blouse',
        'f1' => 'formal-shirt',
        'f2' => 'collar-blouse',
        'f3' => 'formal-shirt',
        'f4' => 'barong',
        'a1' => 'active-tee',
        'a2' => 'active-tee',
        'a3' => 'polo',
        'a4' => 'polo',
        'fb1' => 'linen-shirt',
        'fb2' => 'collar-blouse',
        'fb3' => 'polo',
        'fb4' => 'barong',
    ];
}
