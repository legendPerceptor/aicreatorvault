import { useState } from 'react';

function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (username.length < 3) {
        setError('Username must be at least 3 characters');
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { username, email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Auth successful, call the success callback
      if (onAuthSuccess) {
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>AI Creator Vault</h1>
        <p className="auth-subtitle">管理你的 AI 创作资产</p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            登录
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-30个字符"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6个字符"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
              />
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {mode === 'login' ? (
              <>
                还没有账号？{' '}
                <button className="link-button" onClick={() => switchMode('register')}>
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账号？{' '}
                <button className="link-button" onClick={() => switchMode('login')}>
                  立即登录
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <style>{`
        .auth-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .auth-container {
          background: white;
          border-radius: 16px;
          padding: 40px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .auth-container h1 {
          text-align: center;
          margin: 0 0 8px 0;
          color: #333;
        }

        .auth-subtitle {
          text-align: center;
          color: #666;
          margin: 0 0 24px 0;
        }

        .auth-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .auth-tabs button {
          flex: 1;
          padding: 12px;
          border: none;
          background: #f0f0f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }

        .auth-tabs button.active {
          background: #667eea;
          color: white;
        }

        .auth-tabs button:hover:not(.active) {
          background: #e0e0e0;
        }

        .auth-error {
          background: #fee;
          border: 1px solid #fcc;
          color: #c00;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .form-group input {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .auth-submit {
          margin-top: 8px;
          padding: 14px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .auth-submit:hover:not(:disabled) {
          background: #5568d3;
        }

        .auth-submit:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .auth-footer {
          margin-top: 24px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        .link-button {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .link-button:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default AuthPage;
