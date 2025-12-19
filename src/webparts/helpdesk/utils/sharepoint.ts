export function odataEscape(value : string): string{
    return value.replace(/'/g, "''");
}

// Construye filtro "contains"
export function containsText(fieldInternalName: string, text: string): string{
    const t = odataEscape(text.toLowerCase());
    return `substringof('${t}',${fieldInternalName})`;
}