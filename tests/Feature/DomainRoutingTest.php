<?php

namespace Tests\Feature;

use Tests\TestCase;

class DomainRoutingTest extends TestCase
{
    public function test_root_domain_serves_landing_page(): void
    {
        $response = $this->get('https://pogrid.id/');
        $response->assertOk();
    }

    public function test_www_domain_serves_landing_page(): void
    {
        $response = $this->get('https://www.pogrid.id/');
        $response->assertOk();
    }

    public function test_app_subdomain_root_redirects_to_login(): void
    {
        $response = $this->get('https://app.pogrid.id/');
        $response->assertRedirect('https://app.pogrid.id/login');
    }

    public function test_root_domain_login_path_redirects_to_app_domain(): void
    {
        $response = $this->get('https://pogrid.id/login');
        $response->assertRedirect('https://app.pogrid.id/login');
    }

    public function test_root_domain_register_path_redirects_to_app_domain(): void
    {
        $response = $this->get('https://pogrid.id/register');
        $response->assertRedirect('https://app.pogrid.id/register');
    }

    public function test_root_domain_serves_legal_pages_without_redirect(): void
    {
        $response = $this->get('https://pogrid.id/terms');
        $response->assertOk();

        $response = $this->get('https://pogrid.id/privacy');
        $response->assertOk();
    }

    public function test_landing_page_renders_landing_component(): void
    {
        $this->get('https://pogrid.id/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Landing/Landing'));
    }
}
