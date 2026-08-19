<?php

namespace App\Http\Controllers;

use App\Services\DuitkuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DuitkuController extends Controller
{
    public function handleCallback(Request $request, DuitkuService $duitkuService): JsonResponse
    {
        $result = $duitkuService->handleCallback($request);

        return response()->json($result['response'], $result['status']);
    }
}
