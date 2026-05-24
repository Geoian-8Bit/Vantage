'use client'

import { useState } from 'react'

import { IconEye, IconEyeOff } from './icons'

type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>

/**
 * Input de contraseña con botón de ojo para mostrar/ocultar el texto
 * momentáneamente. Es client porque alterna el estado de visibilidad, pero
 * funciona dentro de un <form action={serverAction}> normal: solo necesita
 * su `name` para que el valor llegue al FormData.
 */
export function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`w-full rounded-xl border border-border bg-surface px-3 py-2.5 pr-10 text-sm text-text ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-subtext transition-colors hover:text-text"
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  )
}
