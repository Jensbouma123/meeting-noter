function isSpecialPiece(piece: string): boolean {
  return piece.length > 2 && piece.startsWith('<') && piece.endsWith('>');
}

export function pieceText(piece: string | undefined): string {
  if (!piece || isSpecialPiece(piece)) return '';
  return piece.replace(/▁/g, ' ');
}
