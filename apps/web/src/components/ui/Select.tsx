import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export default function Select({ className = '', error, children, ...props }: SelectProps) {
  return (
    <select
      className={`input-base ${error ? 'border-destructive focus:border-destructive' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
