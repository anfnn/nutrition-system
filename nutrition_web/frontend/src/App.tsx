import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RoleSelection from './components/RoleSelection'
import Dashboard from './components/Admin/Dashboard'
import DishesManagement from './components/Admin/DishesManagement'

function ProtectedRoute({ children, allowedRole }: { children: JSX.Element, allowedRole: string }) {
  const role = localStorage.getItem('role')
  
  if (role !== allowedRole) {
    return <Navigate to="/" replace />
  }
  
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRole="patient">
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin">
            <DishesManagement />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App