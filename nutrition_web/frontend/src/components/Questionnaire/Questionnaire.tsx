import { useState, useEffect } from 'react'
import axios from 'axios'
import { saveAs } from 'file-saver'

const STAGE1_QUESTIONS = [
  { id: 1, text: 'Есть ли у вас заболевания ЖКТ (гастрит, язва)?', type: 'binary' },
  { id: 2, text: 'Есть ли у вас почечная недостаточность?', type: 'binary' },
  { id: 3, text: 'Находится ли заболевание в стадии ремиссии?', type: 'binary' }
]

const STAGE2_QUESTIONS = [
  { id: 101, text: 'Аллергия на морепродукты?', type: 'binary' },
  { id: 102, text: 'Аллергия на орехи?', type: 'binary' },
  { id: 103, text: 'Непереносимость лактозы?', type: 'binary' },
  { id: 104, text: 'Непереносимость глютена?', type: 'binary' },
  { id: 105, text: 'Аллергия на яичный белок?', type: 'binary' },
  { id: 106, text: 'Диабет?', type: 'binary' },
  { id: 107, text: 'Атеросклероз?', type: 'binary' }
]

export default function Questionnaire() {
  const [stage, setStage] = useState(() => {
    const saved = localStorage.getItem('questionnaire_stage')
    return saved ? parseInt(saved) : 1
  })
  
  const [answers1, setAnswers1] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('questionnaire_answers1')
    return saved ? JSON.parse(saved) : {}
  })
  
  const [answers2, setAnswers2] = useState<Record<number, boolean>>(() => {
    const saved = localStorage.getItem('questionnaire_answers2')
    return saved ? JSON.parse(saved) : {}
  })
  
  const [disliked, setDisliked] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)
  const [excludedDishIds, setExcludedDishIds] = useState<number[]>([])

  useEffect(() => {
    localStorage.setItem('questionnaire_stage', stage.toString())
    localStorage.setItem('questionnaire_answers1', JSON.stringify(answers1))
    localStorage.setItem('questionnaire_answers2', JSON.stringify(answers2))
  }, [stage, answers1, answers2])

  const handleStage1 = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/questionnaire/stage1', { answers: answers1 })
      console.log('Stage1 response:', res.data)
      setStage(2)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleStage2 = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/questionnaire/optimize', {
        stage1: answers1,
        stage2: answers2,
        disliked_ingredients: disliked.split(',').map(s => s.trim()).filter(Boolean)
      })
      
      const shownIds = (res.data.ration?.dishes || []).map((d: any) => d.dish_id)
      setExcludedDishIds(shownIds)
      
      const resultData = { ...res.data, date: new Date().toLocaleDateString() }
      localStorage.setItem('lastDietResult', JSON.stringify(resultData))
      
      setResult(res.data)
      setStage(3)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка оптимизации')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setError('')
    try {
      // Исправленный запрос: передаём diet_id и правильные диапазоны
      const res = await axios.post('http://127.0.0.1:8000/api/questionnaire/refresh', {
        stage1: answers1,
        stage2: answers2,
        diet_name: result.diet?.name,
        diet_id: result.diet?.id,  // ← ДОБАВЛЕНО
        diet_targets: {
          calories_min: result.diet?.calories_min || 1500,
          calories_max: result.diet?.calories_max || 2500,
          protein_min: result.diet?.protein_min || 60,
          protein_max: result.diet?.protein_max || 120,
          fat_min: result.diet?.fat_min || 40,
          fat_max: result.diet?.fat_max || 100,
          carbs_min: result.diet?.carbs_min || 200,
          carbs_max: result.diet?.carbs_max || 400
        },
        disliked_ingredients: disliked.split(',').map(s => s.trim()).filter(Boolean),
        exclude_dish_ids: excludedDishIds
      })
      
      const newIds = (res.data.ration?.dishes || []).map((d: any) => d.dish_id)
      setExcludedDishIds([...excludedDishIds, ...newIds])
      
      setResult({
        ...result,
        ration: res.data.ration
      })
    } catch (err: any) {
      setError('Не удалось обновить блюда')
    } finally {
      setRefreshing(false)
    }
  }

  const downloadReport = () => {
    let text = 'ПЛАН ПИТАНИЯ\n'
    text += '='.repeat(40) + '\n\n'
    text += `Диета: ${result.diet?.name || 'Не указана'}\n`
    text += `Описание: ${result.diet?.description || ''}\n`
    if (result.diet?.recommendation) {
      text += `Рекомендации: ${result.diet.recommendation}\n`
    }
    text += '\nКБЖУ НА ДЕНЬ:\n'
    text += `  Калории: ${Math.round(result.ration?.totals?.calories || 0)} ккал\n`
    text += `  Белки:   ${Math.round(result.ration?.totals?.protein || 0)} г\n`
    text += `  Жиры:    ${Math.round(result.ration?.totals?.fat || 0)} г\n`
    text += `  Углеводы: ${Math.round(result.ration?.totals?.carbs || 0)} г\n`
    text += '\nБЛЮДА:\n'
    result.ration?.dishes?.forEach((d: any, i: number) => {
      text += `\n${i + 1}. ${d.dish_name || 'Блюдо #' + d.dish_id}\n`
      text += `   Порция: ${d.grams} г\n`
      text += `   Ккал: ${d.calories} | Б: ${d.protein} г | Ж: ${d.fat} г | У: ${d.carbs} г\n`
    })
    text += '\n' + '='.repeat(40) + '\n'
    text += `Дата: ${new Date().toLocaleDateString()}\n`

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `plan_${new Date().toLocaleDateString()}.txt`)
  }

  const resetQuestionnaire = () => {
    setStage(1)
    setResult(null)
    setExcludedDishIds([])
    setAnswers1({})
    setAnswers2({})
    setDisliked('')
    localStorage.removeItem('questionnaire_stage')
    localStorage.removeItem('questionnaire_answers1')
    localStorage.removeItem('questionnaire_answers2')
    localStorage.removeItem('lastDietResult')
  }

  if (stage === 3 && result) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Результаты оптимизации</h2>
        
        <div style={{ background: '#e3f2fd', padding: 15, borderRadius: 8, marginTop: 15 }}>
          <h4>Диета: {result.diet?.name}</h4>
          {result.diet?.description && <p>{result.diet.description}</p>}
          {result.diet?.recommendation && (
            <div style={{ background: '#fff3e0', padding: 10, borderRadius: 6, marginTop: 10 }}>
              <strong>Рекомендации:</strong>
              <p>{result.diet.recommendation}</p>
            </div>
          )}
        </div>
        
        {result.ration?.totals && (
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, 
            marginTop: 15, textAlign: 'center' 
          }}>
            <div style={{ background: '#ffebee', padding: 10, borderRadius: 6 }}>
              <strong>Калории</strong><br/>{Math.round(result.ration.totals.calories)} ккал
            </div>
            <div style={{ background: '#e8f5e9', padding: 10, borderRadius: 6 }}>
              <strong>Белки</strong><br/>{Math.round(result.ration.totals.protein)} г
            </div>
            <div style={{ background: '#fff3e0', padding: 10, borderRadius: 6 }}>
              <strong>Жиры</strong><br/>{Math.round(result.ration.totals.fat)} г
            </div>
            <div style={{ background: '#e3f2fd', padding: 10, borderRadius: 6 }}>
              <strong>Углеводы</strong><br/>{Math.round(result.ration.totals.carbs)} г
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <h4 style={{ margin: 0 }}>Блюда на день:</h4>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            style={{
              padding: '10px 20px',
              background: refreshing ? '#ccc' : '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}>
            {refreshing ? 'Обновление...' : 'Обновить блюда'}
          </button>
        </div>
        
        {result.ration?.dishes?.map((item: any, i: number) => (
          <div key={i} style={{ 
            background: 'white', padding: 12, margin: '8px 0', 
            borderRadius: 8, border: '1px solid #e0e0e0' 
          }}>
            <strong>{item.dish_name || `Блюдо #${item.dish_id}`}</strong>
            <span style={{ float: 'right', color: '#666' }}>{item.grams} г</span>
            {item.calories && (
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                {item.calories} ккал | Б: {item.protein} г | Ж: {item.fat} г | У: {item.carbs} г
              </div>
            )}
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={resetQuestionnaire}
            style={{ padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Пройти заново
          </button>
          <button onClick={downloadReport}
            style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Скачать отчёт (TXT)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>{stage === 1 ? 'Анкета — Этап 1 (Здоровье)' : 'Анкета — Этап 2 (Аллергии)'}</h2>
      
      {error && <div style={{ color: 'red', padding: 10, background: '#ffebee', borderRadius: 6, marginBottom: 20 }}>{error}</div>}
      
      {stage === 1 && (
        <>
          {STAGE1_QUESTIONS.map(q => (
            <div key={q.id} style={{ marginBottom: 20 }}>
              <p><strong>{q.text}</strong></p>
              <div>
                <label style={{ marginRight: 20, cursor: 'pointer' }}>
                  <input type="radio" name={`q${q.id}`} checked={answers1[q.id] === true}
                    onChange={() => setAnswers1({...answers1, [q.id]: true})} /> Да
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <input type="radio" name={`q${q.id}`} checked={answers1[q.id] === false}
                    onChange={() => setAnswers1({...answers1, [q.id]: false})} /> Нет
                </label>
              </div>
            </div>
          ))}

          <div style={{ marginBottom: 20 }}>
            <p><strong>Укажите ваш рост и вес для расчёта ИМТ</strong></p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                placeholder="Рост (см)"
                value={answers1['height'] || ''}
                onChange={e => {
                  const height = parseFloat(e.target.value) || 0
                  const weight = answers1['weight'] || 0
                  const bmi = height > 0 ? +(weight / ((height / 100) ** 2)).toFixed(1) : 0
                  setAnswers1({ ...answers1, 'height': height, 4: bmi })
                }}
                style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', width: '48%' }}
              />
              <input
                type="number"
                placeholder="Вес (кг)"
                value={answers1['weight'] || ''}
                onChange={e => {
                  const weight = parseFloat(e.target.value) || 0
                  const height = answers1['height'] || 0
                  const bmi = height > 0 ? +(weight / ((height / 100) ** 2)).toFixed(1) : 0
                  setAnswers1({ ...answers1, 'weight': weight, 4: bmi })
                }}
                style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', width: '48%' }}
              />
            </div>
            {answers1[4] > 0 && (
              <p style={{ marginTop: 8, color: '#2196F3', fontWeight: 'bold' }}>
                Ваш ИМТ: {answers1[4]} 
                {answers1[4] < 18.5 ? ' (недостаточный вес)' : 
                 answers1[4] < 25 ? ' (норма)' : 
                 answers1[4] < 30 ? ' (избыточный вес)' : ' (ожирение)'}
              </p>
            )}
          </div>
        </>
      )}
      
      {stage === 2 && (
        <>
          {STAGE2_QUESTIONS.map(q => (
            <div key={q.id} style={{ marginBottom: 20 }}>
              <p><strong>{q.text}</strong></p>
              <label style={{ marginRight: 20, cursor: 'pointer' }}>
                <input type="radio" name={`sq${q.id}`} checked={answers2[q.id] === true}
                  onChange={() => setAnswers2({...answers2, [q.id]: true})} /> Да
              </label>
              <label style={{ cursor: 'pointer' }}>
                <input type="radio" name={`sq${q.id}`} checked={answers2[q.id] === false}
                  onChange={() => setAnswers2({...answers2, [q.id]: false})} /> Нет
              </label>
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <p><strong>Нелюбимые ингредиенты (через запятую):</strong></p>
            <input type="text" value={disliked} onChange={e => setDisliked(e.target.value)}
              placeholder="Например: лук, чеснок"
              style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', width: '100%' }} />
          </div>
        </>
      )}
      
      <button onClick={stage === 1 ? handleStage1 : handleStage2} disabled={loading}
        style={{
          padding: '12px 30px', background: loading ? '#ccc' : '#FF9800', color: 'white',
          border: 'none', borderRadius: 8, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 20
        }}>
        {loading ? 'Обработка...' : (stage === 1 ? 'Далее' : 'Получить рекомендации')}
      </button>
    </div>
  )
}