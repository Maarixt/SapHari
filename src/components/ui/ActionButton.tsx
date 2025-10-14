import { ButtonHTMLAttributes } from 'react';

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition shadow-soft disabled:opacity-60 ${className}`}
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-xl bg-white border border-ink-200 text-ink-900 hover:bg-[var(--surface)] transition ${className}`}
    />
  );
}

export function DestructiveButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-xl bg-red-500 text-white hover:brightness-95 transition shadow-soft ${className}`}
    />
  );
}
