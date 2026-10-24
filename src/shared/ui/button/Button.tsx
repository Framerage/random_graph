import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/shared/lib';
import styles from './Button.module.scss';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  /** Во всю ширину родителя. */
  block?: boolean;
};

export function Button({ variant = 'primary', block = false, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.btn, variant === 'ghost' && styles.ghost, block && styles.block, className)}
      {...rest}
    />
  );
}
