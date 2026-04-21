import { useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import './App.css'

const whitelist = [
  { ad: 'aa9987', name: '黃紅賊', dept: '訓練中心', title: '隊員' },
  { ad: 'wang.fire', name: '王小明', dept: '消防局救災救護指揮中心', title: '隊員' },
]

const mockBooks = {
  'BOOK-001': { id: 'BOOK-001', title: '消防戰術與指揮', category: '消防戰術' },
  'BOOK-002': { id: 'BOOK-002', title: '火災學概論', category: '基礎教材' },
  'BOOK-003': { id: 'BOOK-003', title: '緊急救護實務', category: '救護教材' },
}

function App() {
  const [step, setStep] = useState('login')
  const [form, setForm] = useState({ name: '', ad: '' })
  const [user, setUser] = useState(null)
  const [book, setBook] = useState(null)
  const [error, setError] = useState('')
  const [records, setRecords] = useState([])
  const [scannerStarted, setScannerStarted] = useState(false)
  const [scannerMessage, setScannerMessage] = useState('點下方按鈕後，系統會請求相機權限，預設使用後置鏡頭')
  const qrRef = useRef(null)

  const currentTime = useMemo(() => new Date().toLocaleString('zh-TW'), [records.length])

  const handleLogin = (e) => {
    e.preventDefault()
    const match = whitelist.find(
      (item) =>
        item.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        item.ad.trim().toLowerCase() === form.ad.trim().toLowerCase(),
    )

    if (!match) {
      setError('查無符合的使用者資料，請確認全名與 AD 帳號是否正確')
      return
    }

    setUser(match)
    setError('')
    setStep('home')
  }

  const startMockScan = () => {
    const keys = Object.keys(mockBooks)
    const randomKey = keys[Math.floor(Math.random() * keys.length)]
    setBook(mockBooks[randomKey])
    setStep('confirm')
  }

  const stopCamera = async () => {
    if (qrRef.current) {
      try {
        if (qrRef.current.isScanning) {
          await qrRef.current.stop()
        }
        await qrRef.current.clear()
      } catch {}
      qrRef.current = null
    }
    setScannerStarted(false)
  }

  const startCamera = async () => {
    if (scannerStarted) return
    setError('')
    setScannerMessage('正在請求相機權限，準備開啟後置鏡頭...')

    try {
      const scanner = new Html5Qrcode('reader')
      qrRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          const found = mockBooks[decodedText] || { id: decodedText, title: `書籍代碼 ${decodedText}`, category: '未分類' }
          setBook(found)
          setScannerMessage(`已掃描到書籍代碼：${decodedText}`)
          await stopCamera()
          setStep('confirm')
        },
        () => {},
      )

      setScannerStarted(true)
      setScannerMessage('後置鏡頭已開啟，請將書本 QR Code 對準框內')
    } catch (err) {
      try {
        const devices = await Html5Qrcode.getCameras()
        if (!devices || devices.length === 0) {
          setScannerMessage('找不到可用鏡頭，請確認手機瀏覽器已允許相機權限')
          return
        }

        const backCamera =
          devices.find((device) => /back|rear|environment|後/i.test(device.label)) || devices[devices.length - 1]

        const scanner = qrRef.current || new Html5Qrcode('reader')
        qrRef.current = scanner

        await scanner.start(
          backCamera.id,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            const found = mockBooks[decodedText] || { id: decodedText, title: `書籍代碼 ${decodedText}`, category: '未分類' }
            setBook(found)
            setScannerMessage(`已掃描到書籍代碼：${decodedText}`)
            await stopCamera()
            setStep('confirm')
          },
          () => {},
        )

        setScannerStarted(true)
        setScannerMessage('後置鏡頭已開啟，請將書本 QR Code 對準框內')
      } catch (fallbackErr) {
        setScannerStarted(false)
        setScannerMessage('無法開啟鏡頭，請允許瀏覽器使用相機，或先用模擬掃碼')
        setError(fallbackErr?.message || err?.message || '鏡頭初始化失敗')
      }
    }
  }

  const confirmBorrow = () => {
    const record = {
      borrower: user.name,
      dept: user.dept,
      title: user.title,
      ad: user.ad,
      bookId: book.id,
      bookTitle: book.title,
      time: new Date().toLocaleString('zh-TW'),
    }
    setRecords((prev) => [record, ...prev])
    setStep('success')
  }

  const resetToHome = async () => {
    setBook(null)
    await stopCamera()
    setStep('home')
  }

  return (
    <div className="app-shell">
      <div className="page-glow page-glow-top" />
      <div className="page-glow page-glow-bottom" />

      <div className="phone-frame">
        <header className="app-header">
          <div className="hero-banner">
            <div className="hero-copy">
              <div className="hero-badge">消防局訓練中心</div>
              <h1>消防局圖書借閱系統</h1>
              <p>以手機快速完成身分確認、掃碼借閱與借閱登記。</p>
            </div>
            <div className="hero-side-card">
              <img src="./images/fire-reading.jpg" alt="消防閱讀插圖" className="hero-mascot" />
              <div className="hero-side-text">
                <strong>今日借閱提醒</strong>
                <span>先登入，再開後置鏡頭掃描書籍 QR Code。</span>
              </div>
            </div>
          </div>
        </header>

        {step === 'login' && (
          <section className="card card-login">
            <div className="section-heading">
              <div>
                <h2>登入驗證</h2>
                <p className="hint">請輸入全名與 AD 帳號完成身分確認</p>
              </div>
              <div className="mini-photo-card">
                <img src="./images/firefighter-team.jpg" alt="消防員現場勤務照片" />
                <span>感謝每一位執勤弟兄姊妹</span>
              </div>
            </div>

            <form className="form" onSubmit={handleLogin}>
              <label>
                全名
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：黃紅賊"
                />
              </label>
              <label>
                AD 帳號
                <input
                  value={form.ad}
                  onChange={(e) => setForm({ ...form, ad: e.target.value })}
                  placeholder="例如：aa9987"
                />
              </label>
              <button type="submit">登入系統</button>
            </form>

            <div className="demo-box">
              <strong>測試帳號</strong>
              <div>姓名：黃紅賊</div>
              <div>AD：aa9987</div>
              <div>單位：訓練中心</div>
              <div>職稱：隊員</div>
            </div>
            {error && <p className="error">{error}</p>}
          </section>
        )}

        {step === 'home' && user && (
          <section className="card">
            <div className="section-heading compact">
              <div>
                <h2>使用者首頁</h2>
                <p className="hint">登入完成後，可直接進入掃碼借閱流程</p>
              </div>
            </div>
            <div className="info-grid">
              <div><span>姓名</span><strong>{user.name}</strong></div>
              <div><span>AD</span><strong>{user.ad}</strong></div>
              <div><span>單位</span><strong>{user.dept}</strong></div>
              <div><span>職稱</span><strong>{user.title}</strong></div>
            </div>
            <div className="action-stack">
              <button onClick={() => setStep('scan')}>開啟鏡頭掃碼</button>
              <button className="secondary" onClick={() => setStep('records')}>查看借閱紀錄</button>
            </div>
          </section>
        )}

        {step === 'scan' && (
          <section className="card">
            <div className="section-heading compact">
              <div>
                <h2>掃描書籍 QR Code</h2>
                <p className="hint">可用手機鏡頭掃描，或先按模擬掃碼展示流程</p>
              </div>
            </div>
            <div id="reader" className="reader-box" />
            <p className="scan-note">{scannerMessage}</p>
            <div className="action-stack">
              <button onClick={startCamera}>開啟後置鏡頭並請求權限</button>
              <button className="secondary" onClick={startMockScan}>模擬掃描一本書</button>
              <button className="ghost" onClick={resetToHome}>返回首頁</button>
            </div>
          </section>
        )}

        {step === 'confirm' && user && book && (
          <section className="card">
            <div className="section-heading compact">
              <div>
                <h2>借閱確認</h2>
                <p className="hint">請確認借閱人資訊與書籍資訊是否正確</p>
              </div>
            </div>
            <div className="info-grid">
              <div><span>借閱人</span><strong>{user.name}</strong></div>
              <div><span>單位</span><strong>{user.dept}</strong></div>
              <div><span>職稱</span><strong>{user.title}</strong></div>
              <div><span>書名</span><strong>{book.title}</strong></div>
              <div><span>書號</span><strong>{book.id}</strong></div>
              <div><span>分類</span><strong>{book.category}</strong></div>
            </div>
            <div className="action-stack">
              <button onClick={confirmBorrow}>確認借閱</button>
              <button className="ghost" onClick={resetToHome}>取消</button>
            </div>
          </section>
        )}

        {step === 'success' && user && book && (
          <section className="card success-card">
            <div className="section-heading compact">
              <div>
                <h2>借閱成功</h2>
                <p className="hint">系統已完成登記，可返回首頁或查看紀錄</p>
              </div>
            </div>
            <p className="success-copy">{user.name} 已借閱《{book.title}》</p>
            <p className="hint">登記時間：{currentTime}</p>
            <div className="action-stack">
              <button onClick={resetToHome}>回首頁</button>
              <button className="secondary" onClick={() => setStep('records')}>查看借閱紀錄</button>
            </div>
          </section>
        )}

        {step === 'records' && (
          <section className="card">
            <div className="section-heading compact">
              <div>
                <h2>借閱紀錄</h2>
                <p className="hint">可查看目前登記的借閱資訊</p>
              </div>
            </div>
            {records.length === 0 ? (
              <p className="hint">目前尚無借閱紀錄</p>
            ) : (
              <div className="record-list">
                {records.map((record, index) => (
                  <article key={`${record.bookId}-${index}`} className="record-item">
                    <strong>{record.bookTitle}</strong>
                    <div>{record.borrower} / {record.dept}</div>
                    <div>{record.ad}</div>
                    <div>{record.time}</div>
                  </article>
                ))}
              </div>
            )}
            <div className="action-stack">
              <button onClick={() => setStep('home')}>返回首頁</button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default App
