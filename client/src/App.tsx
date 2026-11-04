import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Arena } from './pages/Arena'
import { Experiments } from './pages/Experiments'
import { Benchmark } from './pages/Benchmark'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Arena />} />
          <Route path="experiments" element={<Experiments />} />
          <Route path="benchmark" element={<Benchmark />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
