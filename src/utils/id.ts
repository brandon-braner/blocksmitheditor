let counter = 0;

export function generateId(): string {
  counter++;
  const random = Math.random().toString(36).substring(2, 8);
  return `block-${counter}-${random}`;
}
