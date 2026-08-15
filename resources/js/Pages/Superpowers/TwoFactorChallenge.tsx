import { useState, type FormEvent } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    Button,
    Card,
    Center,
    Heading,
    Stack,
    Text,
    TextInput,
} from '@astryxdesign/core';

export default function TwoFactorChallenge() {
    const [useRecovery, setUseRecovery] = useState(false);
    const totp = useForm({ code: '' });
    const recovery = useForm({ recovery_code: '' });

    const submitTotp = (event: FormEvent) => {
        event.preventDefault();
        totp.post('/superpowers/2fa/challenge');
    };

    const submitRecovery = (event: FormEvent) => {
        event.preventDefault();
        recovery.post('/superpowers/2fa/recovery');
    };

    return (
        <>
            <Head title="Verifikasi dua faktor" />
            <Center width="100%" height="100vh">
                <Card width={420} maxWidth="100%" padding={6}>
                    <Stack gap={5}>
                        <Stack gap={1}>
                            <Heading level={1}>Verifikasi identitas</Heading>
                            <Text type="supporting" display="block">
                                {useRecovery
                                    ? 'Masukkan salah satu recovery code yang belum pernah dipakai.'
                                    : 'Masukkan kode enam digit dari aplikasi authenticator.'}
                            </Text>
                        </Stack>

                        {useRecovery ? (
                            <form onSubmit={submitRecovery}>
                                <Stack gap={4}>
                                    <TextInput
                                        label="Recovery code"
                                        value={recovery.data.recovery_code}
                                        onChange={(value) => recovery.setData('recovery_code', value)}
                                        status={
                                            recovery.errors.recovery_code
                                                ? {
                                                      type: 'error',
                                                      message: recovery.errors.recovery_code,
                                                  }
                                                : undefined
                                        }
                                        width="100%"
                                        isRequired
                                    />
                                    <Button
                                        label="Verifikasi recovery code"
                                        variant="primary"
                                        type="submit"
                                        isLoading={recovery.processing}
                                    />
                                </Stack>
                            </form>
                        ) : (
                            <form onSubmit={submitTotp}>
                                <Stack gap={4}>
                                    <TextInput
                                        label="Kode authenticator"
                                        value={totp.data.code}
                                        onChange={(value) =>
                                            totp.setData(
                                                'code',
                                                value.replace(/\D/g, '').slice(0, 6),
                                            )
                                        }
                                        status={
                                            totp.errors.code
                                                ? { type: 'error', message: totp.errors.code }
                                                : undefined
                                        }
                                        width="100%"
                                        isRequired
                                    />
                                    <Button
                                        label="Verifikasi"
                                        variant="primary"
                                        type="submit"
                                        isLoading={totp.processing}
                                    />
                                </Stack>
                            </form>
                        )}

                        <Button
                            label={useRecovery ? 'Gunakan authenticator' : 'Gunakan recovery code'}
                            variant="ghost"
                            onClick={() => setUseRecovery((value) => !value)}
                        />
                    </Stack>
                </Card>
            </Center>
        </>
    );
}
