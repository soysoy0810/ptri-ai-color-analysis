<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('designs', function (Blueprint $table) {
            $table->string('garment_type', 40)->nullable()->after('style_code');
            $table->string('audience', 20)->default('unisex')->after('garment_type');
            $table->string('preview_image', 255)->nullable()->after('audience');
            $table->string('tryon_image', 255)->nullable()->after('preview_image');
        });
    }

    public function down(): void
    {
        Schema::table('designs', function (Blueprint $table) {
            $table->dropColumn(['garment_type', 'audience', 'preview_image', 'tryon_image']);
        });
    }
};
