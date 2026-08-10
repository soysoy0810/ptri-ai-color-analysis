<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('colors', function (Blueprint $table) {
            $table->string('id', 20)->primary();
            $table->string('name', 120);
            $table->char('hex', 7);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('label', 120);
            $table->string('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('fabrics', function (Blueprint $table) {
            $table->string('id', 20)->primary();
            $table->string('code', 40);
            $table->string('name', 180);
            $table->char('hex', 7);
            $table->unsignedInteger('base_match')->default(80);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('designs', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('category_id', 40);
            $table->string('name', 180);
            $table->string('style_code', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->foreign('category_id')->references('id')->on('categories');
        });

        Schema::create('backgrounds', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('label', 120);
            $table->char('tone', 7)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('kiosk_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name', 180);
            $table->string('age_range', 40)->nullable();
            $table->string('gender', 40)->nullable();
            $table->string('email', 180)->nullable();
            $table->string('status', 40)->default('active');
            $table->string('selection_mode', 20)->nullable();
            $table->string('category_id', 40)->nullable();
            $table->string('design_id', 40)->nullable();
            $table->string('fabric_id', 40)->nullable();
            $table->string('background_id', 40)->nullable();
            $table->string('result_token', 64)->nullable()->index();
            $table->json('top20_json')->nullable();
            $table->json('selected_colors_json')->nullable();
            $table->json('analysis_meta_json')->nullable();
            $table->json('payload_json')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index('status');
        });

        Schema::create('staff_alerts', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->nullable();
            $table->string('status', 40)->default('open');
            $table->json('meta_json')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('email_queue', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id');
            $table->string('email', 180);
            $table->string('status', 40)->default('queued');
            $table->json('payload_json')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('actor', 180)->nullable();
            $table->string('action', 120);
            $table->json('meta_json')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('email_queue');
        Schema::dropIfExists('staff_alerts');
        Schema::dropIfExists('kiosk_sessions');
        Schema::dropIfExists('backgrounds');
        Schema::dropIfExists('designs');
        Schema::dropIfExists('fabrics');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('colors');
    }
};
