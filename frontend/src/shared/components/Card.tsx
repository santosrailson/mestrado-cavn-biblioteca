import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function Card({ children, className, as: Component = 'div' }: CardProps) {
  const classes = clsx('card', className);
  return <Component className={classes}>{children}</Component>;
}

Card.Header = function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('mb-3 border-b border-[var(--color-border)] pb-3', className)}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h3 className={clsx('text-lg font-semibold text-text', className)}>{children}</h3>;
};

Card.Body = function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('text-sm text-[var(--color-text-muted)]', className)}>{children}</div>
  );
};

Card.Footer = function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx('mt-4 flex items-center gap-2', className)}>{children}</div>;
};
