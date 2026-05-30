import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'secondary', 
  pulse = false, 
  children, 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none border transition-colors';
  
  const variants = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground border-border',
    success: 'bg-success/15 text-success border-success/20',
    warning: 'bg-warning/15 text-warning border-warning/20',
    destructive: 'bg-destructive/15 text-destructive border-destructive/20',
    outline: 'bg-transparent text-foreground border-border hover:bg-accent',
    info: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'destructive' && 'bg-destructive',
            variant === 'primary' && 'bg-primary',
            variant === 'info' && 'bg-indigo-400'
          )} />
          <span className={cn(
            "relative inline-flex rounded-full h-1.5 w-1.5",
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'destructive' && 'bg-destructive',
            variant === 'primary' && 'bg-primary',
            variant === 'info' && 'bg-indigo-400'
          )} />
        </span>
      )}
      {children}
    </span>
  );
};
