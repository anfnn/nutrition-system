import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/auth/register', {
        full_name: fullName,
        email,
        password
      })
      
      alert('Регистрация успешна! Теперь войдите используя полное имя и пароль.')
      navigate('/login')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Ошибка регистрации')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 30 }}>
      <h2> Регистрация</h2>
      {error && (
        <div style={{ color: '#721c24', background: '#f8d7da', padding: 12, borderRadius: 6, marginBottom: 20 }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Полное имя *"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          minLength={2}
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Пароль *"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={4}
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>Зарегистрироваться</button>
      </form>
      <p style={{ marginTop: 20, textAlign: 'center' }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: 12,
  margin: '8px 0',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 16,
  boxSizing: 'border-box' as const
}

const buttonStyle = {
  width: '100%',
  padding: 12,
  marginTop: 16,
  background: '#2196F3',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  fontSize: 16,
  cursor: 'pointer'
}