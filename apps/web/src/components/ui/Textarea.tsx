import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export default function Textarea({ className = '', error, ...props }: TextareaProps) {
  return (
    <textarea
      className={`input-base resize-vertical min-h-[80px] ${error ? 'border-destructive focus:border-destructive' : ''} ${className}`}
      {...props}
    />
  )
}
