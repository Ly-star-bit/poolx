'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { InlineMessage } from '@/components/feedback/inline-message';
import { resetPassword } from '@/features/auth/api/auth';
import {
  AuthButton,
  AuthFormField,
  AuthInput,
  SecondaryButton,
} from '@/features/auth/components/auth-form-primitives';

export function PasswordResetConfirmForm() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';
  const token = searchParams?.get('token') || '';
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => resetPassword({ email, token }),
    onSuccess: async (password) => {
      try {
        await navigator.clipboard.writeText(password);
        setMessage({ tone: 'success', text: `密码已重置，新密码已复制到剪贴板：${password}` });
      } catch {
        setMessage({ tone: 'success', text: `密码已重置：${password}` });
      }
    },
    onError: (error: Error) => {
      setMessage({ tone: 'danger', text: error.message || '密码重置失败，请重新获取链接。' });
    },
  });

  const missingParams = !email || !token;

  return (
    <div className='w-full max-w-[420px] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)]/90 p-7 sm:p-8 shadow-2xl backdrop-blur-xl transition-all'>
      <div className='mb-6 text-center'>
        <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-secondary)] shadow-lg shadow-[var(--brand-primary)]/20 ring-4 ring-[var(--brand-primary)]/10'>
          <span className='text-lg font-black tracking-tight text-white'>PX</span>
        </div>
        <h1 className='text-xl font-bold tracking-tight text-[var(--foreground-primary)]'>
          密码重置确认
        </h1>
        <p className='mt-1 text-xs text-[var(--foreground-muted)]'>
          确认后，系统会生成新的随机密码
        </p>
      </div>

      <div className='space-y-4'>
        <AuthFormField label='邮箱地址'>
          <AuthInput value={email} readOnly />
        </AuthFormField>

        {missingParams ? (
          <InlineMessage tone='danger' message='重置链接缺少必要参数，请重新发起密码重置。' />
        ) : null}

        {message ? <InlineMessage tone={message.tone} message={message.text} /> : null}

        <div className='flex flex-col gap-3 sm:flex-row'>
          <AuthButton type='button' disabled={missingParams || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? '处理中...' : '确认重置密码'}
          </AuthButton>
          {message?.tone === 'success' ? (
            <SecondaryButton
              type='button'
              onClick={async () => {
                const password = message.text.split('：').pop() || '';
                if (password) {
                  await navigator.clipboard.writeText(password);
                }
              }}
            >
              再次复制密码
            </SecondaryButton>
          ) : null}
        </div>

        <div className='mt-6 text-center text-xs text-[var(--foreground-muted)]'>
          处理完成后可返回
          <Link href='/login' className='ml-1.5 font-medium text-[var(--brand-primary)] hover:underline transition'>
            登录页
          </Link>
        </div>
      </div>
    </div>
  );
}
