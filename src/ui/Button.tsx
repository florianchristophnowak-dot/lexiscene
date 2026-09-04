import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  large?: boolean;
  block?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'secondary', large, block, className, children, type = 'button', ...rest }: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, large ? 'btn--large' : '', block ? 'btn--block' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Pflicht: Symbolschaltflächen brauchen eine barrierefreie Beschriftung und einen Tooltip. */
  label: string;
  children: ReactNode;
}

export function IconButton({ label, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={['icon-btn', className ?? ''].filter(Boolean).join(' ')} title={label} aria-label={label} {...rest}>
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
