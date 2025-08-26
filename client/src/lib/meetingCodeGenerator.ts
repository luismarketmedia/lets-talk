// Gera códigos de reunião em diferentes formatos profissionais

export type MeetingCodeFormat = 'google-meet' | 'zoom' | 'teams' | 'simple';

const generateRandomChars = (length: number, includeNumbers = true, includeLetters = true): string => {
  const numbers = '0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  
  let chars = '';
  if (includeNumbers) chars += numbers;
  if (includeLetters) chars += letters;
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

const generateRandomNumbers = (length: number): string => {
  return generateRandomChars(length, true, false);
};

const generateRandomLetters = (length: number): string => {
  return generateRandomChars(length, false, true);
};

export const generateMeetingCode = (format: MeetingCodeFormat = 'google-meet'): string => {
  switch (format) {
    case 'google-meet':
      // Formato: abc-defg-hij (3 grupos de 3-4 caracteres)
      return [
        generateRandomChars(3, true, true),
        generateRandomChars(4, true, true),
        generateRandomChars(3, true, true)
      ].join('-');
      
    case 'zoom':
      // Formato: 123-456-789 (3 grupos de 3 números)
      return [
        generateRandomNumbers(3),
        generateRandomNumbers(3),
        generateRandomNumbers(3)
      ].join('-');
      
    case 'teams':
      // Formato: 123 456 789 (3 grupos de 3 números com espaços)
      return [
        generateRandomNumbers(3),
        generateRandomNumbers(3),
        generateRandomNumbers(3)
      ].join(' ');
      
    case 'simple':
      // Formato: ABCD-1234 (4 letras + 4 números)
      return [
        generateRandomLetters(4).toUpperCase(),
        generateRandomNumbers(4)
      ].join('-');
      
    default:
      return generateMeetingCode('google-meet');
  }
};

export const validateMeetingCode = (code: string): boolean => {
  // Remove espaços e hífens para validação
  const cleanCode = code.replace(/[\s-]/g, '');
  
  // Deve ter pelo menos 6 caracteres alfanuméricos
  if (cleanCode.length < 6) return false;
  
  // Deve conter apenas letras e números
  return /^[a-zA-Z0-9]+$/.test(cleanCode);
};

export const formatMeetingCode = (code: string): string => {
  // Remove caracteres especiais e converte para minúsculas
  const clean = code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  if (clean.length === 0) return '';
  
  // Se o código limpo tem 9-12 caracteres, format como Google Meet
  if (clean.length >= 9 && clean.length <= 12) {
    const part1 = clean.substring(0, 3);
    const part2 = clean.substring(3, 7);
    const part3 = clean.substring(7);
    return `${part1}-${part2}-${part3}`;
  }
  
  // Se tem 6-8 caracteres, format em 2 partes
  if (clean.length >= 6 && clean.length <= 8) {
    const mid = Math.ceil(clean.length / 2);
    const part1 = clean.substring(0, mid);
    const part2 = clean.substring(mid);
    return `${part1}-${part2}`;
  }
  
  return clean;
};

// Exemplos de códigos gerados:
// Google Meet: abc-defg-hij
// Zoom: 123-456-789  
// Teams: 123 456 789
// Simple: ABCD-1234
