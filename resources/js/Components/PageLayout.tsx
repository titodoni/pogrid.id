import { type ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { Banner, Heading, Stack, Text } from '@astryxdesign/core';
import type { SuperpowersPageProps } from '@/types';

interface PageLayoutProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
}

export default function PageLayout({ title, description, actions, children }: PageLayoutProps) {
    const { flash } = usePage<SuperpowersPageProps>().props;

    return (
        <Stack gap={4} width="100%">
            <Stack direction="horizontal" gap={4} vAlign="center" hAlign="between">
                <Stack gap={1}>
                    <Heading level={1}>{title}</Heading>
                    {description && <Text type="supporting">{description}</Text>}
                </Stack>
                {actions}
            </Stack>

            {flash?.success && (
                <Banner status="success" title={flash.success} />
            )}
            {flash?.error && (
                <Banner status="error" title={flash.error} />
            )}
            {flash?.warning && (
                <Banner status="warning" title={flash.warning} />
            )}
            {flash?.info && (
                <Banner status="info" title={flash.info} />
            )}

            {children}
        </Stack>
    );
}
