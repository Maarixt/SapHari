import React from "react";

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition shadow-soft disabled:opacity-60"
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-4 py-2 rounded-xl bg-white border border-ink-200 text-ink-900 hover:bg-[var(--surface)] transition"
    />
  );
}

export function DestructiveButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-4 py-2 rounded-xl bg-accent-red text-white hover:brightness-95 transition shadow-soft"
    />
  );
}
