'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { InlineMessage } from '@/components/feedback/inline-message';
import { TurnstileWidget } from '@/components/forms/turnstile-widget';
import { sendPasswordResetEmail } from '@/features/auth/api/auth';
import { getPublicStatus } from '@/features/auth/api/public';
import {
  AuthButton,
  AuthFormField,
  AuthInput,
} from '@/features/auth/components/auth-form-primitives';
import { PublicAuthGuard } from '@/features/auth/components/public-auth-guard';

const resetRequestSchema = z.object({
  email: z.string().email('请输入有效邮箱地址'),
});

type ResetRequestFormValues = z.infer<typeof resetRequestSchema>;

export function PasswordResetRequestForm() {
  const [turnstileToken, setTurnstileToken] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);

  const form = useForm<ResetRequestFormValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  });

  const statusQuery = useQuery({
    queryKey: ['public-status'],
    queryFn: getPublicStatus,
  });

  const mutation = useMutation({
    mutationFn: (values: ResetRequestFormValues) =>
      sendPasswordResetEmail(values.email, turnstileToken || undefined),
    onSuccess: () => {
      setMessage({ tone: 'success', text: '重置邮件发送成功，请检查邮箱。' });
      form.reset();
    },
    onError: (error: Error) => {
      setMessage({ tone: 'danger', text: error.message || '重置邮件发送失败，请稍后重试。' });
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setMessage(null);
    if (statusQuery.data?.turnstile_check && !turnstileToken) {
      setMessage({ tone: 'info', text: '请先完成人机验证。' });
      return;
    }
    mutation.mutate(values);
  });

  return (
    <PublicAuthGuard>
      <div className='w-full max-w-[420px] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)]/90 p-7 sm:p-8 shadow-2xl backdrop-blur-xl transition-all'>
        <div className='mb-6 text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-secondary)] shadow-lg shadow-[var(--brand-primary)]/20 ring-4 ring-[var(--brand-primary)]/10'>
            <span className='text-lg font-black tracking-tight text-white'>PX</span>
          </div>
          <h1 className='text-xl font-bold tracking-tight text-[var(--foreground-primary)]'>
            密码重置
          </h1>
          <p className='mt-1 text-xs text-[var(--foreground-muted)]'>
            提交后，系统会向你的注册邮箱发送重置链接
          </p>
        </div>
        <form className='space-y-4' onSubmit={handleSubmit}>
          <AuthFormField label='邮箱地址'>
            <AuthInput type='email' placeholder='请输入邮箱地址' {...form.register('email')} />
            {form.formState.errors.email ? (
              <span className='text-xs text-[var(--status-danger-foreground)]'>
                {form.formState.errors.email.message}
              </span>
            ) : null}
          </AuthFormField>

          {statusQuery.data?.turnstile_check && statusQuery.data.turnstile_site_key ? (
            <TurnstileWidget
              siteKey={statusQuery.data.turnstile_site_key}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken('')}
              onError={() => setTurnstileToken('')}
            />
          ) : null}

          {message ? <InlineMessage tone={message.tone} message={message.text} /> : null}

          <AuthButton type='submit' disabled={mutation.isPending}>
            {mutation.isPending ? '提交中...' : '发送重置邮件'}
          </AuthButton>
        </form>

        <div className='mt-6 text-center text-xs text-[var(--foreground-muted)]'>
          想起密码了？
          <Link href='/login' className='ml-1.5 font-medium text-[var(--brand-primary)] hover:underline transition'>
            返回登录
          </Link>
        </div>
      </div>
    </PublicAuthGuard>
  );
}
