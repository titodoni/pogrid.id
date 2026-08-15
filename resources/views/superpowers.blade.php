<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ isset($pageTitle) ? "{$pageTitle} — Superpowers" : 'Superpowers — POGrid' }}</title>
    @viteReactRefresh
    @vite(['resources/js/superpowers.tsx', 'resources/css/superpowers.css'])
    @inertiaHead
</head>
<body class="antialiased">
    @inertia
</body>
</html>
