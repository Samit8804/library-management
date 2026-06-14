import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export async function lookupIsbn(isbn: string) {
  const clean = isbn.replace(/[-\s]/g, '')
  const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`)
  const json = await res.json()
  const data = json[`ISBN:${clean}`]
  if (!data) return null
  return {
    title: data.title || '',
    author: data.authors?.map((a: any) => a.name).join(', ') || '',
    publisher: data.publishers?.map((p: any) => p.name).join(', ') || '',
    isbn: clean,
  }
}
