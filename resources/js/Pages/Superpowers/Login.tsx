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

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/superpowers/login');
    };

    return (
        <>
            <Head title="Masuk" />
            <Center width="100%" height="100vh">
                <Card width={420} maxWidth="100%" padding={6}>
                    <form onSubmit={submit}>
                        <Stack gap={5}>
                            <Stack gap={1}>
                                <Heading level={1}>Superpowers</Heading>
                                <Text type="supporting" display="block">
                                    Panel developer POGrid. Hanya untuk superadmin.
                                </Text>
                            </Stack>

                            <Stack gap={4}>
                                <TextInput
                                    label="Email"
                                    type="email"
                                    value={data.email}
                                    onChange={(value) => setData('email', value)}
                                    status={
                                        errors.email
                                            ? { type: 'error', message: errors.email }
                                            : undefined
                                    }
                                    width="100%"
                                    isRequired
                                />
                                <TextInput
                                    label="Kata sandi"
                                    type="password"
                                    value={data.password}
                                    onChange={(value) => setData('password', value)}
                                    status={
                                        errors.password
                                            ? { type: 'error', message: errors.password }
                                            : undefined
                                    }
                                    width="100%"
                                    isRequired
                                />
                            </Stack>

                            <Button
                                label="Masuk"
                                variant="primary"
                                type="submit"
                                isLoading={processing}
                            />
                        </Stack>
                    </form>
                </Card>
            </Center>
        </>
    );
}
