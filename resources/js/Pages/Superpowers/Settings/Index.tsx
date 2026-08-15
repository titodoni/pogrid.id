import { useState, type FormEvent } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Button,
    Card,
    Heading,
    Stack,
    Switch,
    Text,
    TextArea,
} from '@astryxdesign/core';
import SuperAdminShell from '@/Components/SuperAdminShell';
import PageLayout from '@/Components/PageLayout';

interface SettingsIndexProps {
    maintenance_mode: boolean;
    maintenance_message: string | null;
}

export default function SettingsIndex({
    maintenance_mode,
    maintenance_message,
}: SettingsIndexProps) {
    const [enabled, setEnabled] = useState(maintenance_mode);
    const messageForm = useForm({ message: maintenance_message ?? '' });

    const toggleMaintenance = (next: boolean) => {
        setEnabled(next);
        if (
            next &&
            !window.confirm(
                'Aktifkan maintenance global? Semua tenant akan dibatasi aksesnya sampai dinonaktifkan.',
            )
        ) {
            setEnabled(false);
            return;
        }

        router.post(
            '/superpowers/settings/maintenance',
            { enabled: next },
            { preserveScroll: true },
        );
    };

    const saveMessage = (event: FormEvent) => {
        event.preventDefault();
        messageForm.post('/superpowers/settings/message', {
            preserveScroll: true,
        });
    };

    return (
        <SuperAdminShell>
            <Head title="Pengaturan" />
            <PageLayout
                title="Pengaturan"
                description="Kontrol tingkat platform seperti maintenance mode global."
            >
                <Card padding={5} maxWidth={720}>
                    <Stack gap={4}>
                        <Stack gap={1}>
                            <Heading level={3}>Maintenance mode global</Heading>
                            <Text type="supporting" display="block">
                                Saat aktif, seluruh tenant melihat halaman
                                maintenance dan akses dibatasi.
                            </Text>
                        </Stack>

                        <Switch
                            label="Aktifkan maintenance global"
                            value={enabled}
                            onChange={toggleMaintenance}
                            labelPosition="start"
                            labelSpacing="spread"
                        />

                        <form onSubmit={saveMessage}>
                            <Stack gap={3}>
                                <TextArea
                                    label="Pesan maintenance"
                                    description="Ditampilkan ke pengguna tenant selama maintenance."
                                    value={messageForm.data.message}
                                    onChange={(value) =>
                                        messageForm.setData('message', value)
                                    }
                                    rows={4}
                                    width="100%"
                                    status={
                                        messageForm.errors.message
                                            ? {
                                                  type: 'error',
                                                  message:
                                                      messageForm.errors.message,
                                              }
                                            : undefined
                                    }
                                />
                                <Stack direction="horizontal">
                                    <Button
                                        label="Simpan pesan"
                                        variant="primary"
                                        type="submit"
                                        isLoading={messageForm.processing}
                                    />
                                </Stack>
                            </Stack>
                        </form>
                    </Stack>
                </Card>
            </PageLayout>
        </SuperAdminShell>
    );
}
