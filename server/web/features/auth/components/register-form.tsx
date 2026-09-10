'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { InlineMessage } from '@/components/feedback/inline-message';
import { TurnstileWidget } from '@/components/forms/turnstile-widget';
import {
  register as registerUser,
  sendEmailVerification,
} from '@/features/auth/api/auth';
import { getPublicStatus } from '@/features/auth/api/public';
import {
  AuthButton,
  AuthFormField,
  AuthInput,
  SecondaryButton,
} from '@/features/auth/components/auth-form-primitives';
import { PublicAuthGuard } from '@/features/auth/components/public-auth-guard';

const baseSchemaObject = z.object({
  username: z.string().min(1, '请输入用户名').max(12, '用户名最长 12 位'),
  password: z.string().min(8, '密码至少 8 位').max(20, '密码最长 20 位'),
  password2: z.string().min(8, '请再次输入密码'),
  email: z.string().optional(),
  verification_code: z.string().optional(),
});

const baseSchema = baseSchemaObject.refine((data) => data.password === data.password2, {
  message: '两次输入的密码不一致',
  path: ['password2'],
});

type RegisterFormValues = z.infer<typeof baseSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);

  const statusQuery = useQuery({
    queryKey: ['public-status'],
    queryFn: getPublicStatus,
  });

  const needsEmailVerification = statusQuery.data?.email_verification ?? false;
  const needsTurnstile = statusQuery.data?.turnstile_check ?? false;

  const schema = useMemo(() => {
    if (!needsEmailVerification) {
      return baseSchema;
    }

    return baseSchemaObject
      .extend({
        email: z.string().email('请输入有效邮箱地址'),
        verification_code: z.string().min(1, '请输入验证码'),
      })
      .refine((data) => data.password === data.password2, {
        message: '两次输入的密码不一致',
        path: ['password2'],
      });
  }, [needsEmailVerification]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
      password2: '',
      email: '',
      verification_code: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      registerUser(
        {
          username: values.username,
          password: values.password,
          email: values.email,
          verification_code: values.verification_code,
        },
        turnstileToken || undefined,
      ),
    onSuccess: () => {
      router.replace('/login');
    },
    onError: (error: Error) => {
      setMessage({ tone: 'danger', text: error.message || '注册失败，请稍后重试。' });
    },
  });

  const verificationMutation = useMutation({
    mutationFn: async () => {
      const email = form.getValues('email');
      if (!email) {
        form.setError('email', { message: '请输入邮箱地址' });
        return;
      }
      await sendEmailVerification(email, turnstileToken || undefined);
    },
    onSuccess: () => {
      setMessage({ tone: 'success', text: '验证码发送成功，请检查邮箱。' });
    },
    onError: (error: Error) => {
      setMessage({ tone: 'danger', text: error.message || '验证码发送失败，请稍后重试。' });
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setMessage(null);
    if (needsTurnstile && !turnstileToken) {
      setMessage({ tone: 'info', text: '请先完成人机验证。' });
      return;
    }
    registerMutation.mutate(values);
  });

  return (
    <PublicAuthGuard>
      <div className='w-full max-w-[460px] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)]/90 p-7 sm:p-8 shadow-2xl backdrop-blur-xl transition-all'>
        <div className='mb-6 text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-secondary)] shadow-lg shadow-[var(--brand-primary)]/20 ring-4 ring-[var(--brand-primary)]/10'>
            <span className='text-lg font-black tracking-tight text-white'>PX</span>
          </div>
          <h1 className='text-xl font-bold tracking-tight text-[var(--foreground-primary)]'>
            新用户注册
          </h1>
          <p className='mt-1 text-xs text-[var(--foreground-muted)]'>
            创建账号以接入代理池控制平台
          </p>
        </div>
        <form className='space-y-4' onSubmit={handleSubmit}>
          <AuthFormField label='用户名' hint='最长 12 位'>
            <AuthInput placeholder='请输入用户名' {...form.register('username')} />
            {form.formState.errors.username ? (
              <span className='text-xs text-[var(--status-danger-foreground)]'>
                {form.formState.errors.username.message}
              </span>
            ) : null}
          </AuthFormField>

          <AuthFormField label='密码' hint='最短 8 位，最长 20 位'>
            <AuthInput type='password' placeholder='请输入密码' {...form.register('password')} />
            {form.formState.errors.password ? (
              <span className='text-xs text-[var(--status-danger-foreground)]'>
                {form.formState.errors.password.message}
              </span>
            ) : null}
          </AuthFormField>

          <AuthFormField label='确认密码'>
            <AuthInput type='password' placeholder='请再次输入密码' {...form.register('password2')} />
            {form.formState.errors.password2 ? (
              <span className='text-xs text-[var(--status-danger-foreground)]'>
                {form.formState.errors.password2.message}
              </span>
            ) : null}
          </AuthFormField>

          {needsEmailVerification ? (
            <>
              <AuthFormField label='邮箱地址'>
                <AuthInput type='email' placeholder='请输入邮箱地址' {...form.register('email')} />
                {form.formState.errors.email ? (
                  <span className='text-xs text-[var(--status-danger-foreground)]'>
                    {form.formState.errors.email.message}
                  </span>
                ) : null}
              </AuthFormField>

              <AuthFormField label='邮箱验证码'>
                <div className='flex flex-col gap-3 sm:flex-row'>
                  <AuthInput
                    placeholder='请输入验证码'
                    className='flex-1'
                    {...form.register('verification_code')}
                  />
                  <SecondaryButton
                    type='button'
                    onClick={() => {
                      if (needsTurnstile && !turnstileToken) {
                        setMessage({ tone: 'info', text: '请先完成人机验证。' });
                        return;
                      }
                      setMessage(null);
                      verificationMutation.mutate();
                    }}
                    disabled={verificationMutation.isPending}
                  >
                    {verificationMutation.isPending ? '发送中...' : '获取验证码'}
                  </SecondaryButton>
                </div>
                {form.formState.errors.verification_code ? (
                  <span className='text-xs text-[var(--status-danger-foreground)]'>
                    {form.formState.errors.verification_code.message}
                  </span>
                ) : null}
              </AuthFormField>
            </>
          ) : null}

          {needsTurnstile && statusQuery.data?.turnstile_site_key ? (
            <TurnstileWidget
              siteKey={statusQuery.data.turnstile_site_key}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken('')}
              onError={() => setTurnstileToken('')}
            />
          ) : null}

          {message ? <InlineMessage tone={message.tone} message={message.text} /> : null}

          <AuthButton type='submit' disabled={registerMutation.isPending}>
            {registerMutation.isPending ? '注册中...' : '注册'}
          </AuthButton>
        </form>

        <div className='mt-6 text-center text-xs text-[var(--foreground-muted)]'>
          已有账户？
          <Link href='/login' className='ml-1.5 font-medium text-[var(--brand-primary)] hover:underline transition'>
            点击登录
          </Link>
        </div>
      </div>
    </PublicAuthGuard>
  );
}
