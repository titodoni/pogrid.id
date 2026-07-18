<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>POgrid.id</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <script>
            (function() {
                try {
                    const theme = localStorage.getItem('pogrid_theme') || 'theme-default';
                    document.documentElement.className = theme;
                } catch (e) {}
            })();
        </script>
        @viteReactRefresh
        @vite(['resources/js/app.tsx', 'resources/css/app.css'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
