import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

interface Dish {
  id?: number
  name: string
  description: string
  recipe: string
  calories: number
  protein: number
  fat: number
  carbs: number
  allergens: string
  diet_id: number
}

interface Diet {
  id: number
  name: string
}

export default function DishesManagement() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [diets, setDiets] = useState<Diet[]>([])
  const [editing, setEditing] = useState<Dish | null>(null)
  const [form, setForm] = useState<Dish>({
    name: '', description: '', recipe: '',
    calories: 0, protein: 0, fat: 0, carbs: 0, allergens: '', diet_id: 0
  })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchDishes()
    fetchDiets()
  }, [])

  const fetchDishes = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/dishes/')
      setDishes(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Ошибка загрузки блюд')
    }
  }

  const fetchDiets = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/dishes/diets/')
      setDiets(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Ошибка загрузки диет')
    }
  }

  const getDietName = (dietId: number) => {
    const diet = diets.find(d => d.id === dietId)
    return diet ? diet.name : '—'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing?.id) {
        await axios.put(`http://127.0.0.1:8000/api/dishes/${editing.id}`, form)
        setMessage('Блюдо обновлено')
      } else {
        await axios.post('http://127.0.0.1:8000/api/dishes/', form)
        setMessage('Блюдо создано')
      }
      await fetchDishes()
      resetForm()
    } catch (err: any) {
      setMessage('Ошибка: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить блюдо #' + id + '?')) return
    try {
      await axios.delete(`http://127.0.0.1:8000/api/dishes/${id}`)
      setMessage('Блюдо удалено')
      fetchDishes()
    } catch (err: any) {
      setMessage('Ошибка удаления: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleEdit = (dish: Dish) => {
    setEditing(dish)
    setForm({
      name: dish.name || '',
      description: dish.description || '',
      recipe: dish.recipe || '',
      calories: dish.calories || 0,
      protein: dish.protein || 0,
      fat: dish.fat || 0,
      carbs: dish.carbs || 0,
      allergens: dish.allergens || '',
      diet_id: dish.diet_id || 0
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditing(null)
    setForm({ name: '', description: '', recipe: '', calories: 0, protein: 0, fat: 0, carbs: 0, allergens: '', diet_id: 0 })
    setShowForm(false)
  }

  const handleBack = () => {
    localStorage.removeItem('role')
    navigate('/')
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Управление блюдами ({dishes.length})</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { resetForm(); setShowForm(!showForm) }}
            style={{ padding: '10px 20px', background: showForm ? '#999' : '#4CAF50', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {showForm ? 'Закрыть' : '+ Добавить блюдо'}
          </button>
          <button onClick={handleBack}
            style={{ padding: '10px 20px', background: '#f44336', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Выйти
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: 12, borderRadius: 6, marginBottom: 15, background: message.includes('Ошибка') ? '#ffebee' : '#e8f5e9', color: message.includes('Ошибка') ? '#c62828' : '#2e7d32' }}>
          {message}
        </div>
      )}

      {/* Форма */}
      {showForm && (
        <div style={{ background: '#f9f9f9', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <h3>{editing ? 'Изменить блюдо #' + editing.id : 'Новое блюдо'}</h3>
          <form onSubmit={handleSubmit}>
            <input placeholder="Название *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={inputStyle} />
            
            <select value={form.diet_id || ''} 
              onChange={e => setForm({...form, diet_id: Number(e.target.value)})}
              required
              style={{...inputStyle, marginTop: 10}}>
              <option value="">Выберите диету</option>
              {diets.map(diet => (
                <option key={diet.id} value={diet.id}>{diet.name}</option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 10 }}>
              <input type="number" placeholder="Ккал *" value={form.calories || ''} onChange={e => setForm({...form, calories: Number(e.target.value)})} required style={inputStyle} />
              <input type="number" placeholder="Белки (г) *" value={form.protein || ''} onChange={e => setForm({...form, protein: Number(e.target.value)})} required style={inputStyle} />
              <input type="number" placeholder="Жиры (г) *" value={form.fat || ''} onChange={e => setForm({...form, fat: Number(e.target.value)})} required style={inputStyle} />
              <input type="number" placeholder="Углеводы (г) *" value={form.carbs || ''} onChange={e => setForm({...form, carbs: Number(e.target.value)})} required style={inputStyle} />
            </div>
            
            <input placeholder="Аллергены (через запятую): молоко, орехи, глютен" value={form.allergens || ''} onChange={e => setForm({...form, allergens: e.target.value})} style={{...inputStyle, marginTop: 10}} />
            <textarea placeholder="Описание (с тегами #диета)" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} style={{...inputStyle, marginTop: 10, minHeight: 60, resize: 'vertical'}} />
            <textarea placeholder="Рецепт" value={form.recipe || ''} onChange={e => setForm({...form, recipe: e.target.value})} style={{...inputStyle, marginTop: 10, minHeight: 60, resize: 'vertical'}} />

            <div style={{ marginTop: 15 }}>
              <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 10 }}>
                {loading ? '...' : (editing ? 'Обновить' : 'Создать')}
              </button>
              <button type="button" onClick={resetForm} style={{ padding: '10px 24px', background: '#999', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Таблица */}
      <h3>Список блюд</h3>
      {dishes.length === 0 ? (
        <p style={{ color: '#999' }}>Нет блюд. Добавьте первое блюдо!</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Название</th>
                <th style={thStyle}>Диета</th>
                <th style={thStyle}>Аллергены</th>
                <th style={thStyle}>Ккал</th>
                <th style={thStyle}>Б/Ж/У</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map(dish => (
                <tr key={dish.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{dish.id}</td>
                  <td style={tdStyle}><strong>{dish.name}</strong></td>
                  <td style={tdStyle}>{getDietName(dish.diet_id)}</td>
                  <td style={tdStyle}>{dish.allergens || '—'}</td>
                  <td style={tdStyle}>{dish.calories}</td>
                  <td style={tdStyle}>{dish.protein}/{dish.fat}/{dish.carbs}г</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(dish)}
                      style={{ padding: '6px 14px', marginRight: 5, background: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      Изменить
                    </button>
                    <button onClick={() => handleDelete(dish.id!)}
                      style={{ padding: '6px 14px', background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 14, width: '100%', boxSizing: 'border-box' as const
}

const thStyle = {
  padding: '10px 8px', textAlign: 'left' as const, fontWeight: 'bold', background: '#f5f5f5'
}

const tdStyle = {
  padding: '8px', verticalAlign: 'middle' as const
}