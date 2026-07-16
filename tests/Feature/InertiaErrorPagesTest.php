<?php

namespace Tests\Feature;

use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class InertiaErrorPagesTest extends TestCase
{
    use RefreshDatabase;

    private function render(HttpException $e): Response
    {
        $request = Request::create('/somewhere', 'GET');
        $request->headers->set('X-Inertia', 'true');
        $request->headers->set('X-Inertia-Version', Inertia::getVersion());

        $response = $this->app->make(ExceptionHandler::class)
            ->render($request, $e);

        return $response;
    }

    public function test_403_renders_errors_403_with_status(): void
    {
        $response = $this->render(new HttpException(403));

        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_404_renders_errors_404_with_status(): void
    {
        $response = $this->render(new HttpException(404));

        $this->assertEquals(404, $response->getStatusCode());
    }

    public function test_419_renders_errors_419_with_status(): void
    {
        $response = $this->render(new HttpException(419));

        $this->assertEquals(419, $response->getStatusCode());
    }

    public function test_500_renders_errors_500_with_status(): void
    {
        $response = $this->render(new HttpException(500));

        $this->assertEquals(500, $response->getStatusCode());
    }
}
