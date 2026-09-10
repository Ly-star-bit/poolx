'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { login } from '@/features/auth/api/auth';
import { getPublicStatus } from '@/features/auth/api/public';
import { PublicAuthGuard } from '@/features/auth/components/public-auth-guard';

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const redirect = searchParams?.get('redirect') || '/';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const statusQuery = useQuery({
    queryKey: ['public-status'],
    queryFn: getPublicStatus,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      setUser(user);
      router.replace(redirect);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || '登录失败，请稍后重试。');
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setErrorMessage('');
    loginMutation.mutate(values);
  });

  const handleGitHubLogin = () => {
    const clientId = statusQuery.data?.github_client_id;
    if (!clientId) {
      setErrorMessage('GitHub 登录当前不可用。');
      return;
    }

    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('scope', 'user:email');
    window.location.href = authorizeUrl.toString();
  };

  return (
    <PublicAuthGuard>
      <div className='w-full max-w-[420px] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)]/90 p-7 sm:p-8 shadow-2xl backdrop-blur-xl transition-all'>
        {/* Header inside the Card */}
        <div className='mb-6 text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-secondary)] shadow-lg shadow-[var(--brand-primary)]/20 ring-4 ring-[var(--brand-primary)]/10'>
            <span className='text-lg font-black tracking-tight text-white'>PX</span>
          </div>
          <h1 className='text-xl font-bold tracking-tight text-[var(--foreground-primary)]'>
            用户登录
          </h1>
          <p className='mt-1 text-xs text-[var(--foreground-muted)]'>
            输入账号凭据以访问控制平面
          </p>
        </div>

        {errorMessage ? (
          <div className='mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400'>
            <AlertCircle className='h-4 w-4 shrink-0 mt-0.5' />
            <span className='leading-relaxed'>{errorMessage}</span>
          </div>
        ) : null}

        <form className='space-y-4' onSubmit={handleSubmit}>
          <div className='space-y-1.5'>
            <label className='text-xs font-medium text-[var(--foreground-secondary)]'>
              用户名
            </label>
            <div className='relative'>
              <User className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)] pointer-events-none' />
              <input
                type='text'
                placeholder='请输入用户名'
                {...form.register('username')}
                className='w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] pl-10 pr-3.5 py-2.5 text-sm text-[var(--foreground-primary)] placeholder:text-[var(--foreground-muted)] outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15'
              />
            </div>
            {form.formState.errors.username ? (
              <p className='text-xs text-[var(--status-danger-foreground)] mt-1'>
                {form.formState.errors.username.message}
              </p>
            ) : null}
          </div>

          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <label className='text-xs font-medium text-[var(--foreground-secondary)]'>
                密码
              </label>
              <Link
                href='/reset'
                className='text-xs text-[var(--brand-primary)] hover:underline transition'
              >
                忘记密码？
              </Link>
            </div>
            <div className='relative'>
              <Lock className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)] pointer-events-none' />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder='请输入密码'
                {...form.register('password')}
                className='w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] pl-10 pr-10 py-2.5 text-sm text-[var(--foreground-primary)] placeholder:text-[var(--foreground-muted)] outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15'
              />
              <button
                type='button'
                onClick={() => setShowPassword((prev) => !prev)}
                className='absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)] transition'
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className='h-4 w-4' />
                ) : (
                  <Eye className='h-4 w-4' />
                )}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className='text-xs text-[var(--status-danger-foreground)] mt-1'>
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <button
            type='submit'
            disabled={loginMutation.isPending}
            className='w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-sky-600 dark:to-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[var(--brand-primary)]/25 hover:brightness-105 active:scale-[0.99] transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>登录中...</span>
              </>
            ) : (
              <>
                <span>登录</span>
                <ArrowRight className='h-4 w-4' />
              </>
            )}
          </button>

          {statusQuery.data?.github_oauth ? (
            <>
              <div className='relative my-4'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-[var(--border-default)]' />
                </div>
                <div className='relative flex justify-center text-xs'>
                  <span className='bg-[var(--surface-panel)] px-2 text-[var(--foreground-muted)]'>
                    或
                  </span>
                </div>
              </div>
              <button
                type='button'
                onClick={handleGitHubLogin}
                className='w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)] transition hover:bg-[var(--control-background-hover)] hover:border-[var(--border-strong)] active:scale-[0.99] cursor-pointer'
              >
                <svg className='h-4 w-4 fill-current' viewBox='0 0 24 24'>
                  <path d='M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z' />
                </svg>
                <span>GitHub 登录</span>
              </button>
            </>
          ) : null}
        </form>

        <p className='mt-6 text-center text-xs text-[var(--foreground-muted)]'>
          还没有账号？{' '}
          <Link
            href='/register'
            className='font-medium text-[var(--brand-primary)] hover:underline transition'
          >
            注册新账号
          </Link>
        </p>
      </div>
    </PublicAuthGuard>
  );
}
