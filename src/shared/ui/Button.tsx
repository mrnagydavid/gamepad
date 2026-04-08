import type { JSX } from 'preact';
import s from './ui.module.css';

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ variant = 'primary', class: cls, children, ...rest }: ButtonProps) {
  return (
    <button class={`${s.btn} ${s[variant]} ${cls ?? ''}`} {...rest}>
      {children}
    </button>
  );
}
