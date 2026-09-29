import { useNavigate } from 'react-router-dom'

export default function RoleSelection() {
  const navigate = useNavigate()

  const handleSelect = (role: string) => {
    localStorage.removeItem('lastDietResult')
    localStorage.removeItem('questionnaire_stage')
    localStorage.removeItem('questionnaire_answers1')
    localStorage.removeItem('questionnaire_answers2')
    localStorage.setItem('role', role)
    navigate(role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', 
      height: '100vh', gap: 30 
    }}>
      <h1>Система подбора питания</h1>
      <p>Выберите режим работы:</p>
      
      <button onClick={() => handleSelect('patient')}
        style={{
          padding: '20px 40px', fontSize: 18,
          background: '#4CAF50', color: 'white',
          border: 'none', borderRadius: 10, cursor: 'pointer'
        }}>
        Я пациент
      </button>
      
      <button onClick={() => handleSelect('admin')}
        style={{
          padding: '20px 40px', fontSize: 18,
          background: '#FF9800', color: 'white',
          border: 'none', borderRadius: 10, cursor: 'pointer'
        }}>
        Я администратор
      </button>
    </div>
  )
}