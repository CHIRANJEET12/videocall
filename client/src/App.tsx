import { useState } from 'react'
import './App.css'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import { User1 } from './users/User1'
import { User2 } from './users/User2'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sender" element={<User1 />} />
        <Route path="/receiver" element={<User2 />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App