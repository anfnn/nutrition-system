// Определяем URL API в зависимости от среды
export const API_BASE_URL = 
  // @ts-ignore - игнорируем ошибку типов
  typeof window !== 'undefined' && window.process?.type === 'renderer'
    ? 'http://127.0.0.1:8000'
    : ''