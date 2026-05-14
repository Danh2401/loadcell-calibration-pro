import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Register success')
    }
  }

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      setLoggedIn(true)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setLoggedIn(false)
  }

  if (loggedIn) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Welcome to Loadcell Calibration App 🎉</h1>

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />
      <br />

      <button onClick={handleLogin}>
        Login
      </button>

      <button onClick={handleRegister}>
        Register
      </button>
    </div>
  )
}