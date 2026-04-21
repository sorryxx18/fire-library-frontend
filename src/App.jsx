import { useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import './App.css'

const whitelist = [
  { ad: 'leif.huang', name: 'Leif Huang', dept: '消防局訓練科', title: '承辦人' },
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
  const [scannerMessage, setScannerMessage] = useState('點下方按鈕後，系統會請求相機權限')
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
      setError('查無白名單資料，請確認全名與 AD 帳號是否正確')
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
    setScannerMessage('正在請求相機權限...')

    try {
      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        setScannerMessage('找不到可用鏡頭，請確認手機瀏覽器有相機權限')
        return
      }

      const cameraId = devices[0].id
      const scanner = new Html5Qrcode('reader')
      qrRef.current = scanner

      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          const found = mockBooks[decodedText] || { id: decodedText, title: `書籍代碼 ${decodedText}`, category: '未分類' }
          setBook(found)
          setScannerMessage(`已掃描到：${decodedText}`)
          await stopCamera()
          setStep('confirm')
        },
        () => {},
      )

      setScannerStarted(true)
      setScannerMessage('鏡頭已開啟，請將書本 QR Code 對準框內')
    } catch (err) {
      setScannerStarted(false)
      setScannerMessage('無法開啟鏡頭，請允許瀏覽器使用相機，或先用模擬掃碼')
      setError(err?.message || '鏡頭初始化失敗')
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
      <div className="phone-frame">
        <header className="app-header">
          <h1>消防局圖書借閱系統</h1>
          <p>前端展示版</p>
        </header>

        {step === 'login' && (
          <section className="card">
            <h2>登入</h2>
            <p className="hint">請輸入全名與 AD 帳號進行白名單比對</p>
            <form className="form" onSubmit={handleLogin}>
              <label>
                全名
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：Leif Huang"
                />
              </label>
              <label>
                AD 帳號
                <input
                  value={form.ad}
                  onChange={(e) => setForm({ ...form, ad: e.target.value })}
                  placeholder="例如：leif.huang"
                />
              </label>
              <button type="submit">登入並驗證白名單</button>
            </form>
            <div className="demo-box">
              <strong>測試帳號</strong>
              <div>姓名：Leif Huang</div>
              <div>AD：leif.huang</div>
            </div>
            {error && <p className="error">{error}</p>}
          </section>
        )}

        {step === 'home' && user && (
          <section className="card">
            <h2>使用者首頁</h2>
            <div className="info-grid">
              <div><span>姓名</span><strong>{user.name}</strong></div>
              <div><span>AD</span><strong>{user.ad}</strong></div>
              <div><span>單位</span><strong>{user.dept}</strong></div>
              <div><span>職稱</span><strong>{user.title}</strong></div>
            </div>
            <button onClick={() => setStep('scan')}>開啟鏡頭掃碼</button>
            <button className="secondary" onClick={() => setStep('records')}>查看借閱紀錄</button>
          </section>
        )}

        {step === 'scan' && (
          <section className="card">
            <h2>掃描書籍 QR Code</h2>
            <p className="hint">可用手機鏡頭掃描，或先按模擬掃碼展示流程</p>
            <div id="reader" className="reader-box" />
            <p className="scan-note">{scannerMessage}</p>
            <button onClick={startCamera}>開啟鏡頭並請求權限</button>
            <button className="secondary" onClick={startMockScan}>模擬掃到一本書</button>
            <button className="ghost" onClick={resetToHome}>返回首頁</button>
          </section>
        )}

        {step === 'confirm' && user && book && (
          <section className="card">
            <h2>借閱確認</h2>
            <div className="info-grid">
              <div><span>借閱人</span><strong>{user.name}</strong></div>
              <div><span>單位</span><strong>{user.dept}</strong></div>
              <div><span>職稱</span><strong>{user.title}</strong></div>
              <div><span>書名</span><strong>{book.title}</strong></div>
              <div><span>書號</span><strong>{book.id}</strong></div>
              <div><span>分類</span><strong>{book.category}</strong></div>
            </div>
            <button onClick={confirmBorrow}>確認借閱</button>
            <button className="ghost" onClick={resetToHome}>取消</button>
          </section>
        )}

        {step === 'success' && user && book && (
          <section className="card success-card">
            <h2>借閱成功</h2>
            <p>{user.name} 已借閱《{book.title}》</p>
            <p className="hint">登記時間：{currentTime}</p>
            <button onClick={resetToHome}>回首頁</button>
            <button className="secondary" onClick={() => setStep('records')}>查看借閱紀錄</button>
          </section>
        )}

        {step === 'records' && (
          <section className="card">
            <h2>借閱紀錄</h2>
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
            <button onClick={() => setStep('home')}>返回首頁</button>
          </section>
        )}
      </div>
    </div>
  )
}

export default App
