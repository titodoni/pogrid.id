import { type ReactNode } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AppShell,
    Avatar,
    Banner,
    Button,
    Heading,
    SideNav,
    SideNavItem,
    Stack,
    Text,
} from '@astryxdesign/core';
import type { SuperpowersPageProps } from '@/types';

const navigation = [
    { label: 'Dashboard', href: '/superpowers' },
    { label: 'Tenant', href: '/superpowers/tenants' },
    { label: 'Langganan', href: '/superpowers/subscriptions' },
    { label: 'System Health', href: '/superpowers/health' },
    { label: 'Error Log', href: '/superpowers/logs' },
    { label: 'Email Delivery', href: '/superpowers/emails' },
    { label: 'Pengaturan', href: '/superpowers/settings' },
] as const;

function routeIsActive(href: string, path: string): boolean {
    if (href === '/superpowers') {
        return path === href || path === `${href}/`;
    }

    return path.startsWith(href);
}

interface SuperAdminShellProps {
    children: ReactNode;
}

export default function SuperAdminShell({ children }: SuperAdminShellProps) {
    const { platformAdmin, platform_maintenance: maintenance } =
        usePage<SuperpowersPageProps>().props;
    const path = typeof window === 'undefined' ? '' : window.location.pathname;

    const sideNav = (
        <SideNav
            header={<Heading level={2}>Superpowers</Heading>}
            footer={
                platformAdmin ? (
                    <Stack gap={3}>
                        <Stack direction="horizontal" gap={2} vAlign="center">
                            <Avatar
                                name={platformAdmin.name}
                                size="sm"
                                src={platformAdmin.avatar_url ?? undefined}
                            />
                            <Stack gap={0.5}>
                                <Text type="label" display="block">
                                    {platformAdmin.name}
                                </Text>
                                <Text type="supporting" display="block" maxLines={1}>
                                    {platformAdmin.email}
                                </Text>
                            </Stack>
                        </Stack>
                        <Button
                            label="Keluar"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.post('/superpowers/logout')}
                        />
                    </Stack>
                ) : undefined
            }
            collapsible={{ buttonLabel: 'Ciutkan navigasi' }}
        >
            {navigation.map((item) => (
                <SideNavItem
                    key={item.href}
                    label={item.label}
                    href={item.href}
                    as={Link}
                    isSelected={routeIsActive(item.href, path)}
                />
            ))}
        </SideNav>
    );

    const banner = maintenance?.enabled ? (
        <Banner
            status="warning"
            title="Global maintenance aktif"
            description={maintenance.message || 'Akses tenant sedang dibatasi sementara.'}
        />
    ) : undefined;

    return (
        <AppShell
            variant="elevated"
            sideNav={sideNav}
            banner={banner}
            contentPadding={4}
            height="fill"
        >
            {children}
        </AppShell>
    );
}
