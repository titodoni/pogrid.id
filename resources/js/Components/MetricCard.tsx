import { Card, Heading, Stack, Text } from '@astryxdesign/core';

interface MetricCardProps {
    label: string;
    value: string | number;
    description?: string;
    variant?: 'default' | 'muted' | 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

export default function MetricCard({
    label,
    value,
    description,
    variant = 'default',
}: MetricCardProps) {
    return (
        <Card padding={4} variant={variant} width="100%">
            <Stack gap={1}>
                <Text type="supporting" display="block">
                    {label}
                </Text>
                <Heading level={2}>{value}</Heading>
                {description && (
                    <Text type="supporting" display="block">
                        {description}
                    </Text>
                )}
            </Stack>
        </Card>
    );
}
