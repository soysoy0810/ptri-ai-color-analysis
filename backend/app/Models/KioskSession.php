<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class KioskSession extends Model
{
    use HasUuids;

    protected $fillable = [
        'full_name',
        'age_range',
        'gender',
        'email',
        'status',
        'selection_mode',
        'category_id',
        'design_id',
        'fabric_id',
        'background_id',
        'result_token',
        'top20_json',
        'selected_colors_json',
        'analysis_meta_json',
        'payload_json',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'top20_json' => 'array',
            'selected_colors_json' => 'array',
            'analysis_meta_json' => 'array',
            'payload_json' => 'array',
            'completed_at' => 'datetime',
        ];
    }
}
