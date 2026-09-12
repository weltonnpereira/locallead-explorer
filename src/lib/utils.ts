import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function prettyStatus(value?: string) {
  switch (value) {
    case "NEW":
      return "Novo";
    case "CONTACTED":
      return "Contatado";
    case "REPLIED":
      return "Respondeu"
    case "MEETING":
      return "Reunião";
    case "PROPOSAL":
      return "Proposta";
    case "CUSTOMER":
      return "Cliente";
    case "LOST":
      return "Perdido";
    default:
      return value;
  }
}

export function formatBRL(value?: string) {
  if (!value) return "";

  const numeric = value.replace(/\D/g, "");
  if (!numeric) return "";
  const amount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(numeric) / 100);
  return amount;
}