import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Questionnaire from '../Questionnaire/Questionnaire'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'questionnaire' | 'results'>('questionnaire')
  const navigate = useNavigate()

const handleBack = () => {
  localStorage.removeItem('role')
  localStorage.removeItem('lastDietResult')
  localStorage.removeItem('questionnaire_stage')
  localStorage.removeItem('questionnaire_answers1')
  localStorage.removeItem('questionnaire_answers2')
  navigate('/')
}

  return (
    <div style={{ padding: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <h1>Личный кабинет пациента</h1>
        <button onClick={handleBack} 
          style={{ padding: '8px 20px', background: '#f44336', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Выйти
        </button>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 30, borderBottom: '2px solid #ddd' }}>
        <button onClick={() => setActiveTab('questionnaire')} style={tabStyle(activeTab === 'questionnaire')}>Анкета</button>
        <button onClick={() => setActiveTab('results')} style={tabStyle(activeTab === 'results')}>Рекомендации</button>
      </div>

      {/* Анкета */}
      {activeTab === 'questionnaire' && <Questionnaire />}

      {/* Рекомендации */}
      {activeTab === 'results' && (
        <div>
          {(() => {
            const savedResult = localStorage.getItem('lastDietResult')
            const result = savedResult ? JSON.parse(savedResult) : null

            if (!result) {
              return (
                <div style={{ background: '#f5f5f5', padding: 30, borderRadius: 12 }}>
                  <h3>Рекомендации</h3>
                  <p>Заполните анкету, чтобы получить план питания.</p>
                  <button onClick={() => setActiveTab('questionnaire')}
                    style={{ padding: '12px 24px', background: '#FF9800', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', marginTop: 15 }}>
                    Перейти к анкете
                  </button>
                </div>
              )
            }

            return (
              <div style={{ background: '#e8f5e9', padding: 20, borderRadius: 12 }}>
                <h3>Ваш план питания</h3>
                <p><strong>Диета:</strong> {result.diet?.name}</p>
                {result.diet?.description && <p>{result.diet.description}</p>}
                {result.diet?.recommendation && (
                  <div style={{ background: '#fff3e0', padding: 10, borderRadius: 6, marginTop: 10 }}>
                    <strong>Рекомендации:</strong>
                    <p>{result.diet.recommendation}</p>
                  </div>
                )}

                {result.ration?.totals && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 15, textAlign: 'center' }}>
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

                <h4 style={{ marginTop: 20 }}>Блюда:</h4>
                {result.ration?.dishes?.map((item: any, i: number) => (
                  <div key={i} style={{ background: 'white', padding: 12, margin: '8px 0', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                    <strong>{item.dish_name || `Блюдо #${item.dish_id}`}</strong>
                    <span style={{ float: 'right', color: '#666' }}>{item.grams} г</span>
                  </div>
                ))}

                <button onClick={() => setActiveTab('questionnaire')}
                  style={{ padding: '12px 24px', background: '#FF9800', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', marginTop: 20 }}>
                  Пройти анкету заново
                </button>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function tabStyle(active: boolean) {
  return {
    padding: '12px 20px',
    background: active ? '#2196F3' : 'transparent',
    color: active ? 'white' : '#333',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    borderRadius: '8px 8px 0 0',
    fontWeight: active ? 'bold' : 'normal'
  } as any
}