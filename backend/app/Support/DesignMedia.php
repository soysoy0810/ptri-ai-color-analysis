<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class DesignMedia
{
    public const DISK = 'public';

    public const DIR = 'catalog/designs';

    public static function storePreview(string $designId, UploadedFile $file): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: 'png');
        $name = 'preview.'.$ext;
        Storage::disk(self::DISK)->putFileAs(self::DIR.'/'.$designId, $file, $name);

        return self::DIR.'/'.$designId.'/'.$name;
    }

    public static function storeTryon(string $designId, UploadedFile $file): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: 'png');
        $name = 'tryon.'.$ext;
        Storage::disk(self::DISK)->putFileAs(self::DIR.'/'.$designId, $file, $name);

        return self::DIR.'/'.$designId.'/'.$name;
    }

    public static function deleteForDesign(string $designId): void
    {
        Storage::disk(self::DISK)->deleteDirectory(self::DIR.'/'.$designId);
    }

    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return url('/api/media/'.str_replace('\\', '/', $path));
    }
}
