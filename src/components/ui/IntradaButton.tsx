import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { intradaBtnClass, type IntradaBtnVariant } from '@/lib/intrada-button'

type BtnProps = ComponentPropsWithoutRef<'button'> & {
  variant: IntradaBtnVariant
  children: ReactNode
}

type LinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant: IntradaBtnVariant
  children: ReactNode
}

export function IntradaButton({ variant, className, children, ...rest }: BtnProps) {
  return (
    <button type="button" className={intradaBtnClass(variant, className)} {...rest}>
      {children}
    </button>
  )
}

export function IntradaLink({ variant, className, children, ...rest }: LinkProps) {
  return (
    <Link className={intradaBtnClass(variant, className)} {...rest}>
      {children}
    </Link>
  )
}

/** Üst menü / geri dönüş (← Modül Adı) */
export function IntradaUstMenuLink({
  href,
  children,
  className,
  ...rest
}: Omit<LinkProps, 'variant'>) {
  return (
    <Link href={href} className={intradaBtnClass('ust-menu', className)} {...rest}>
      {children}
    </Link>
  )
}
