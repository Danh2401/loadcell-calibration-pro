import { useState } from 'react'
import { supabase } from './lib/supabase'
import logo from './assets/logo.png' 
import bgImage from './assets/bg.jpg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      alert(error.message)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
       backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '420px',
          background: 'rgba(0,0,0,0.55)',
          padding: '40px',
          borderRadius: '12px',
          backdropFilter: 'blur(6px)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
  style={{
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
  }}
>
  <img
    src={logo}
    alt="logo"
    style={{
      width: '220px',
      objectFit: 'contain',
      display: 'block',
    }}
  />
</div>

        {/* Title */}
        <h2
          style={{
            fontSize: '30px',
            marginBottom: '10px',
          }}
        >
          CALIB CÂN BỆ XOAY
        </h2>

        <p
          style={{
            marginBottom: '30px',
            color: '#d1d5db',
          }}
        >
          Đăng nhập hệ thống
        </p>

        {/* Email */}
        <input
          type="email"
          placeholder="Tên đăng nhập"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            marginBottom: '18px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
          }}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            marginBottom: '25px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
          }}
        />

        {/* Login Button */}
        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            background: '#2563eb',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Đăng Nhập
        </button>
      </div>
    </div>
  )
}