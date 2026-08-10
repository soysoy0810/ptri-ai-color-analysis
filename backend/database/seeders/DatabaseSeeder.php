<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CatalogSeeder::class,
        ]);

        // Default admin account for the admin panel
        DB::table('users')->updateOrInsert(
            ['email' => 'admin@ptri.dost.gov.ph'],
            [
                'name' => 'PTRI Admin',
                'password' => Hash::make('PTRIadmin2026'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }
}
