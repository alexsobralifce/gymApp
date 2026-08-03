import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export default function Input({ className = '', error, ...props }: InputProps) {
  return (
    <input
      className={`input-base ${error ? 'border-destructive focus:border-destructive' : ''} ${className}`}
      {...props}
    />
  )
}
