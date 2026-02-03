import { useEffect, useState } from 'react'
import './App.css'
import './firebase'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Trainer from './Trainer'

function App() {
  useEffect(() => {
    // Firebase init here later
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/train/:projectId" element={<Trainer />} />
      </Routes>
    </Router>
  )
}

export default App