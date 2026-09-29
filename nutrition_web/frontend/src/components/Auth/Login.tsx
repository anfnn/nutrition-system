import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    try {
      // OAuth2PasswordRequestForm требует form data
      const formData = new URLSearchParams()
      formData.append('username', username)  // ВАЖНО: username = full_name
      formData.append('password', password)
      
      const res = await axios.post(
        'http://127.0.0.1:8000/api/auth/login',
        formData,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Ошибка входа')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 30 }}>
      <h2> Вход в систему</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>Введите ваш email и пароль</p>
      {error && (
        <div style={{ color: '#721c24', background: '#f8d7da', padding: 12, borderRadius: 6, marginBottom: 20 }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <input
            type="email"
            placeholder="Email"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={inputStyle}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>Войти</button>
      </form>
      <p style={{ marginTop: 20, textAlign: 'center' }}>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
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
  background: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  fontSize: 16,
  cursor: 'pointer'
}