import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import './style.css'

type Day = { id: string; day_number: number; created_at: string }
type Word = { id: string; day_number: number; word: string; meaning: string; example: string; created_at: string }

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase: SupabaseClient | null = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

function App() {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(Boolean(supabase))
  const [email, setEmail] = React.useState('')
  const [sent, setSent] = React.useState(false)
  const [days, setDays] = React.useState<Day[]>([])
  const [words, setWords] = React.useState<Word[]>([])
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const [screen, setScreen] = React.useState<'list' | 'study'>('list')
  const [formOpen, setFormOpen] = React.useState(false)
  const [word, setWord] = React.useState('')
  const [meaning, setMeaning] = React.useState('')
  const [example, setExample] = React.useState('')
  const [studyWords, setStudyWords] = React.useState<Word[]>([])
  const [studyIndex, setStudyIndex] = React.useState(0)
  const [revealed, setRevealed] = React.useState(false)
  const [finished, setFinished] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState('')

  React.useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const refresh = React.useCallback(async () => {
    if (!supabase || !user) return
    setBusy(true)
    const [dayResult, wordResult] = await Promise.all([
      supabase.from('vocab_days').select('id, day_number, created_at').order('day_number'),
      supabase.from('vocab_words').select('id, day_number, word, meaning, example, created_at').order('created_at'),
    ])
    if (dayResult.error || wordResult.error) setNotice(dayResult.error?.message ?? wordResult.error?.message ?? '데이터를 불러오지 못했어요.')
    else {
      setDays(dayResult.data ?? [])
      setWords(wordResult.data ?? [])
    }
    setBusy(false)
  }, [user])

  React.useEffect(() => { void refresh() }, [refresh])

  async function sendLoginLink(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    // Resolve Vite's base path (including a GitHub Pages repository path) as a URL.
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.href).href
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    setBusy(false)
    if (error) setNotice(error.message)
    else setSent(true)
  }

  async function addDay() {
    if (!supabase) return
    const nextNumber = (days.at(-1)?.day_number ?? 0) + 1
    setBusy(true)
    const { data, error } = await supabase.from('vocab_days').insert({ day_number: nextNumber }).select().single()
    setBusy(false)
    if (error) setNotice(error.message)
    else {
      setDays([...days, data])
      setSelectedDay(nextNumber)
      setFormOpen(true)
    }
  }

  async function addWord(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase || selectedDay === null) return
    setBusy(true)
    const { error } = await supabase.from('vocab_words').insert({ day_number: selectedDay, word: word.trim(), meaning: meaning.trim(), example: example.trim() })
    setBusy(false)
    if (error) setNotice(error.message)
    else {
      setWord(''); setMeaning(''); setExample(''); setFormOpen(false); setNotice('단어를 추가했어요.')
      await refresh()
    }
  }

  async function deleteWord(item: Word) {
    if (!supabase || !window.confirm(`“${item.word}” 단어를 삭제할까요?`)) return
    const { error } = await supabase.from('vocab_words').delete().eq('id', item.id)
    if (error) setNotice(error.message)
    else { setWords(words.filter((entry) => entry.id !== item.id)); setNotice('단어를 삭제했어요.') }
  }

  function startStudy() {
    const shuffled = [...(wordsByDay.get(selectedDay ?? -1) ?? [])]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setStudyWords(shuffled); setStudyIndex(0); setRevealed(false); setFinished(false); setScreen('study')
  }

  function advanceStudy() {
    if (!revealed) { setRevealed(true); return }
    if (studyIndex + 1 >= studyWords.length) { setFinished(true); return }
    setStudyIndex(studyIndex + 1); setRevealed(false)
  }

  const wordsByDay = React.useMemo(() => {
    const map = new Map<number, Word[]>()
    words.forEach((item) => map.set(item.day_number, [...(map.get(item.day_number) ?? []), item]))
    return map
  }, [words])
  const dayWords = wordsByDay.get(selectedDay ?? -1) ?? []

  if (!supabase) return <SetupScreen />
  if (loading) return <div className="loading-screen"><div className="loader"/><span>단어장을 준비하고 있어요</span></div>
  if (!user) return <main className="auth-shell"><div className="auth-card"><Brand/><div className="eyebrow">MY WORD JOURNAL</div><h1>오늘의 단어를<br/>차곡차곡 모아요</h1><p className="muted">이메일로 로그인 링크를 보내드릴게요.<br/>나만의 단어장이 기기 간에 동기화됩니다.</p>{sent ? <div className="success-box"><span className="success-icon">✉</span><strong>메일을 확인해 주세요</strong><span>{email} 주소로 로그인 링크를 보냈어요.</span></div> : <form onSubmit={sendLoginLink} className="auth-form"><label htmlFor="email">이메일 주소</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required/><button className="button primary full" disabled={busy}>{busy ? '전송 중…' : '로그인 링크 받기'} <span>→</span></button></form>}<p className="auth-foot">계정이 없으면 로그인 링크로 자동 가입돼요.</p></div><span className="auth-decoration">A</span></main>

  return <div className="app-shell">
    <header className="topbar"><Brand/><div className="top-actions"><span className="user-pill"><span className="online-dot"/>{user.email}</span><button className="icon-button logout" aria-label="로그아웃" title="로그아웃" onClick={() => supabase.auth.signOut()}>↗</button></div></header>
    <main className="main-content">
      <section className="greeting"><div><div className="eyebrow">YOUR PERSONAL VOCABULARY</div><h1>단어의 하루<span className="period">.</span></h1><p>매일 조금씩, 나만의 속도로 쌓아가요.</p></div><div className="greeting-mark">✳</div></section>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="알림 닫기">×</button></div>}
      {screen === 'list' ? <>
        <div className="section-heading"><div><h2>나의 Day</h2><span className="section-sub">총 {days.length}일 · 단어 {words.length}개</span></div><button className="button primary" onClick={addDay} disabled={busy}>＋ <span>새 Day</span></button></div>
        {days.length === 0 ? <div className="empty-state"><div className="empty-art">✎</div><h3>첫 번째 Day를 만들어 볼까요?</h3><p>단어를 모을 날짜를 만들고<br/>나만의 단어장을 시작해 보세요.</p><button className="button primary" onClick={addDay}>Day 1 시작하기 <span>→</span></button></div> : <div className="day-list">{[...days].reverse().map((day) => {
          const count = wordsByDay.get(day.day_number)?.length ?? 0
          return <article className={`day-card ${selectedDay === day.day_number ? 'selected' : ''}`} key={day.id} onClick={() => { setSelectedDay(day.day_number); setFormOpen(false) }}>
            <div className="day-number">{String(day.day_number).padStart(2,'0')}</div><div className="day-info"><h3>Day {day.day_number}</h3><span>{count}개 단어</span></div><button className="card-arrow" aria-label={`Day ${day.day_number} 선택`} onClick={(e) => { e.stopPropagation(); setSelectedDay(day.day_number); setFormOpen(false) }}>→</button>
          </article>
        })}</div>}
        {selectedDay !== null && <section className="day-detail"><div className="detail-heading"><div><div className="eyebrow">WORD LIST</div><h2>Day {selectedDay}<span className="count-badge">{dayWords.length}</span></h2></div><div className="detail-actions"><button className="button secondary" onClick={() => setFormOpen((open) => !open)}>{formOpen ? '닫기' : '＋ 단어 추가'}</button><button className="button primary" onClick={startStudy} disabled={dayWords.length === 0}>학습 시작 <span>→</span></button></div></div>
          {formOpen && <form className="word-form" onSubmit={addWord}><div className="form-title"><span className="form-icon">✦</span><div><strong>새 단어 추가</strong><small>Day {selectedDay}에 단어를 기록해요.</small></div></div><label>영단어<input value={word} onChange={(e) => setWord(e.target.value)} placeholder="예: serendipity" required autoFocus/></label><label>한글 뜻<input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="예: 뜻밖의 행운" required/></label><label>영어 예문<textarea value={example} onChange={(e) => setExample(e.target.value)} placeholder="예: It was pure serendipity that we met." rows={2} required/></label><button className="button primary full" disabled={busy}>단어 저장 <span>→</span></button></form>}
          {dayWords.length === 0 ? <div className="list-empty">아직 등록된 단어가 없어요. 첫 단어를 추가해 보세요.</div> : <div className="word-list">{dayWords.map((item, i) => <article className="word-row" key={item.id}><span className="row-index">{String(i+1).padStart(2,'0')}</span><div className="row-copy"><strong>{item.word}</strong><span>{item.meaning}</span><small>{item.example}</small></div><button className="delete-button" aria-label={`${item.word} 삭제`} title="삭제" onClick={() => void deleteWord(item)}>×</button></article>)}</div>}
        </section>}
      </> : <section className="study-screen"><button className="back-button" onClick={() => setScreen('list')}>← Day 목록</button>{finished ? <div className="study-card complete-card"><div className="complete-mark">✦</div><div className="eyebrow">SESSION COMPLETE</div><h2>오늘의 학습 완료!</h2><p>{studyWords.length}개의 단어를 모두 확인했어요.</p><button className="button primary" onClick={startStudy}>다시 섞어서 학습하기 <span>↻</span></button></div> : studyWords.length === 0 ? <div className="study-card complete-card"><div className="eyebrow">DAY {selectedDay}</div><h2>아직 단어가 없어요</h2><button className="button secondary" onClick={() => { setScreen('list'); setFormOpen(true) }}>단어 추가하기</button></div> : <><div className="study-progress"><span>DAY {selectedDay} · 오늘의 학습</span><span>{String(studyIndex+1).padStart(2,'0')} <i>/</i> {String(studyWords.length).padStart(2,'0')}</span></div><div className="progress-track"><span style={{width:`${((studyIndex+1)/studyWords.length)*100}%`}}/></div><button className="study-card" onClick={advanceStudy} aria-label={revealed ? '다음 단어 보기' : '뜻과 예문 보기'}><span className="study-label">WORD {String(studyIndex+1).padStart(2,'0')}</span><span className="study-word">{studyWords[studyIndex].word}</span>{revealed ? <div className="reveal-content"><span className="study-meaning">{studyWords[studyIndex].meaning}</span><span className="study-example">“{studyWords[studyIndex].example}”</span></div> : <span className="tap-hint"><span>◉</span> 화면을 눌러 뜻과 예문 확인</span>}<span className="study-card-footer">{revealed ? '한 번 더 눌러 다음 단어' : 'TAP TO REVEAL'} <span>↗</span></span></button><button className="skip-button" onClick={() => { if (studyIndex + 1 >= studyWords.length) setFinished(true); else { setStudyIndex(studyIndex+1); setRevealed(false) } }}>건너뛰기</button></>}</section>}
    </main><footer className="footer"><span>✳ 단어의 하루</span><span>SMALL STEPS, BIG WORDS.</span></footer>
  </div>
}

function Brand() { return <a className="brand" href={import.meta.env.BASE_URL}><span className="brand-mark">✳</span><span>단어의 하루</span></a> }
function SetupScreen() { return <main className="setup-shell"><div className="setup-card"><Brand/><div className="eyebrow">ONE-TIME SETUP</div><h1>Supabase 연결을<br/>완료해 주세요</h1><p>프로젝트 환경 변수를 설정하면 로그인과 단어장 동기화가 활성화됩니다.</p><ol><li><strong>Supabase 프로젝트</strong>를 만들고 <code>supabase/schema.sql</code>을 SQL Editor에서 실행</li><li><code>.env.example</code>을 <code>.env.local</code>로 복사한 뒤 Project URL과 anon key 입력</li><li><code>npm install</code> 후 <code>npm run dev</code>로 시작</li></ol><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="button primary">Supabase 열기 ↗</a><p className="setup-note">설정 자세한 내용은 README.md를 확인하세요.</p></div></main> }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
