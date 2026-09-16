import { ScriptCategory } from "@/schemas/script";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_LABELS: Record<ScriptCategory, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  COLD_CALL: "Ligação",
  INSTAGRAM: "Instagram",
};

export function scriptCategories(value?: string) {
  switch (value) {
    case "WHATSAPP":
      return "WhatsApp";
    case "EMAIL":
      return "E-mail";
    case "COLD_CALL":
      return "Ligação"
    case "INSTAGRAM":
      return "Instagram";
    default:
      return value;
  }
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