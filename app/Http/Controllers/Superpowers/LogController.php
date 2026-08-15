<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;

class LogController extends Controller
{
    public function index(Request $request)
    {
        $lines = $request->integer('lines', 200);
        $lines = max(50, min(2000, $lines));

        $logPath = storage_path('logs/laravel.log');
        $entries = [];
        $errorCount = 0;

        if (File::exists($logPath)) {
            $content = $this->tailFile($logPath, $lines);
            $entries = $this->parseEntries($content);
            $errorCount = $this->countErrors($logPath);
        }

        return Inertia::render('Superpowers/Logs/Index', [
            'entries' => $entries,
            'error_count' => $errorCount,
            'lines' => $lines,
            'log_exists' => File::exists($logPath),
            'log_size' => File::exists($logPath) ? File::size($logPath) : 0,
        ]);
    }

    /**
     * Count ERROR-level lines by streaming the file in chunks. Loading the
     * whole log into memory (File::get) exhausts memory on production-sized
     * logs, which is exactly when this page is needed most.
     */
    protected function countErrors(string $path): int
    {
        $handle = fopen($path, 'r');

        if (! $handle) {
            return 0;
        }

        $count = 0;

        try {
            while (($line = fgets($handle)) !== false) {
                if (str_contains($line, '.ERROR:')) {
                    $count++;
                }
            }
        } finally {
            fclose($handle);
        }

        return $count;
    }

    /**
     * Read the last N lines of a file efficiently without loading it all.
     */
    protected function tailFile(string $path, int $lines): string
    {
        $handle = fopen($path, 'r');
        if (! $handle) {
            return '';
        }

        $linebreaks = 0;
        $position = 0;
        $chunkSize = 4096;

        fseek($handle, 0, SEEK_END);
        $fileSize = ftell($handle);

        // Walk backwards counting line breaks until we hit N lines or the start.
        while ($position < $fileSize && $linebreaks <= $lines) {
            $seek = min($chunkSize, $fileSize - $position);
            fseek($handle, -($position + $seek), SEEK_END);
            $chunk = fread($handle, $seek);
            $linebreaks += substr_count($chunk, "\n");
            $position += $seek;

            if ($position >= $fileSize) {
                break;
            }
        }

        fseek($handle, -min($position, $fileSize), SEEK_END);
        $content = stream_get_contents($handle);
        fclose($handle);

        return $content;
    }

    /**
     * Parse a raw log blob into structured entries.
     */
    protected function parseEntries(string $content): array
    {
        $pattern = '/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (\w+)\.(\w+): (.+?)(?=\[\d{4}-\d{2}-\d{2}|\z)/s';
        preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

        $entries = [];
        foreach ($matches as $match) {
            $entries[] = [
                'timestamp' => $match[1],
                'env' => $match[2],
                'level' => $match[3],
                'message' => trim($match[4]),
            ];
        }

        return array_reverse($entries);
    }
}
