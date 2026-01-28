import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'px-6 py-3 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800';

  const variantStyles = {
    primary:
      'bg-game-primary hover:bg-blue-600 text-white focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed',
    secondary:
      'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 disabled:bg-slate-600 disabled:cursor-not-allowed',
    danger:
      'bg-game-danger hover:bg-red-600 text-white focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
