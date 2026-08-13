import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { playSfx } from '../services/audioService'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger'
export type ButtonSize = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  icon?: ReactNode
  silent?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-arcane-400 to-arcane-600 text-white border-arcane-600 hover:from-arcane-400 hover:to-arcane-500',
  secondary:
    'bg-night-700 text-slate-100 border-night-500 hover:bg-night-600',
  ghost:
    'bg-transparent text-slate-200 border-white/20 hover:bg-white/10',
  success:
    'bg-gradient-to-b from-leaf-400 to-leaf-600 text-night-900 border-leaf-600 hover:from-leaf-400 hover:to-leaf-500',
  danger:
    'bg-gradient-to-b from-ember-400 to-ember-600 text-white border-ember-600 hover:from-ember-400 hover:to-ember-500',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-[48px] px-5 py-2.5 text-base',
  lg: 'min-h-[60px] px-7 py-3.5 text-lg sm:text-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  silent = false,
  className = '',
  children,
  onClick,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={(event) => {
        if (!silent) playSfx('click')
        onClick?.(event)
      }}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 font-semibold',
        'transition-all duration-150 active:translate-y-0.5 active:border-b-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="text-xl leading-none">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  )
}
