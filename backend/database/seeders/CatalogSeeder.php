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
        'lk1' => 'formal-shirt',
        'lk2' => 'collar-blouse',
        'lk3' => 'collar-blouse',
        'lk4' => 'terno',
        'lk5' => 'active-tee',
        'wn1' => 'formal-shirt',
        'wn2' => 'collar-blouse',
        'wn3' => 'formal-shirt',
        'wn4' => 'collar-blouse',
        'wn5' => 'formal-shirt',
        'wn6' => 'collar-blouse',
        'wn7' => 'formal-shirt',
        'wn8' => 'collar-blouse',
        'wn9' => 'terno',
        'mn1' => 'formal-shirt',
        'mn2' => 'formal-shirt',
        'mn3' => 'formal-shirt',
        'mn4' => 'linen-shirt',
        'mn5' => 'formal-shirt',
        'mn6' => 'formal-shirt',
        'mn7' => 'formal-shirt',
        'mn8' => 'formal-shirt',
        'mn9' => 'formal-shirt',
        'mn10' => 'linen-shirt',
        'mn11' => 'formal-shirt',
        'mn12' => 'formal-shirt',
        'mn13' => 'formal-shirt',
        'mn14' => 'formal-shirt',
        'mn15' => 'linen-shirt',
        'mn16' => 'formal-shirt',
        'mn17' => 'formal-shirt',
        'fp1' => 'barong',
        'fp2' => 'terno',
        'fp3' => 'filipiniana-blouse',
        'fp4' => 'terno',
        'fp5' => 'terno',
        'fp6' => 'filipiniana-blouse',
        'fp7' => 'terno',
        'fp8' => 'filipiniana-blouse',
        'fp9' => 'terno',
        'fp10' => 'filipiniana-blouse',
        'fp11' => 'terno',
        'fp12' => 'filipiniana-blouse',
        'fm1' => 'barong',
        'fm2' => 'barong',
        'fm3' => 'linen-shirt',
        'fm4' => 'linen-shirt',
        'wf1' => 'terno',
        'wf2' => 'terno',
        'wf3' => 'collar-blouse',
        'wf4' => 'collar-blouse',
        'wf5' => 'formal-shirt',
        'wc1' => 'collar-blouse',
        'wc2' => 'linen-shirt',
        'wc3' => 'polo',
        'wc4' => 'collar-blouse',
        'wc5' => 'collar-blouse',
        'wc6' => 'terno',
        'wc7' => 'collar-blouse',
        'mf1' => 'polo',
        'mf2' => 'polo',
        'mf3' => 'formal-shirt',
        'mf4' => 'formal-shirt',
        'mf5' => 'formal-shirt',
        'mc1' => 'active-tee',
        'mc2' => 'polo',
        'mc3' => 'linen-shirt',
        'mc4' => 'linen-shirt',
        'mc5' => 'polo',
        'mc6' => 'formal-shirt',
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
