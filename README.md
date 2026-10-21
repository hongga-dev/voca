# 단어의 하루

Day별로 영단어, 한국어 뜻, 영어 예문을 저장하고 모바일에서 학습하는 React + TypeScript 웹앱입니다. 아이디·비밀번호로 로그인하며, Supabase Auth가 계정별 데이터를 보호합니다. 아이디 로그인을 위해 앱은 아이디를 내부 가상 이메일 주소로 변환합니다.

## 로컬 실행

1. Node.js 22 이상을 설치합니다.
2. Supabase 프로젝트를 만들고 SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
3. Authentication → URL Configuration에서 Site URL에는 배포 주소를 입력하고, Redirect URLs에는 로컬 주소 `http://localhost:5173/`와 정확한 배포 주소를 모두 등록합니다. GitHub Pages의 프로젝트 사이트라면 `https://<계정>.github.io/<저장소>/` 형식입니다. 인증 링크는 현재 페이지 기준으로 이 저장소 경로를 포함해 이동합니다.
4. Authentication → Providers → Email에서 Email provider는 켜고, Confirm email은 끕니다. 앱은 이메일 없이 공개 가입을 받으므로 인증 메일은 보내지 않습니다.
5. `.env.example`을 `.env.local`로 복사하고 Supabase Project URL과 publishable/anon key를 입력합니다.
6. 실행합니다.

```sh
npm install
npm run dev
```

`.env.local`은 Git에 커밋하지 마세요. 브라우저 앱에는 Supabase publishable/anon key만 사용합니다. `service_role` 키는 절대 앱에 넣지 마세요.

## GitHub Pages 배포

1. GitHub에서 이 프로젝트를 저장소로 푸시하고 기본 브랜치 이름을 `main`으로 설정합니다.
2. 저장소 Settings → Pages → Build and deployment에서 Source를 **GitHub Actions**로 선택합니다.
3. 저장소 Settings → Secrets and variables → Actions → Variables에 아래 두 값을 추가합니다.
   - `VITE_SUPABASE_URL`: Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase publishable key 또는 anon key
4. Supabase Authentication URL Configuration에 최종 Pages URL을 Site URL 및 Redirect URL로 추가합니다.
5. `main`에 푸시하거나 Actions 탭에서 `Deploy to GitHub Pages`를 실행합니다.

워크플로는 저장소 이름을 기준으로 Pages 경로를 자동 설정합니다. GitHub Pages는 공개 정적 호스팅이므로 앱 번들에서 Supabase URL과 publishable/anon key를 확인할 수 있습니다. 보안 경계는 키 비공개가 아니라 Supabase Auth와 위 SQL의 Row Level Security 정책입니다.

## 기능

- 아이디·비밀번호 회원가입과 로그인 (아이디: 영문 소문자·숫자·밑줄·하이픈 3~24자)
- Day 생성 및 Day별 단어 수 표시
- 단어·뜻·영어 예문 등록, 삭제 전 확인 후 삭제
- 학습 시작 시 순서 섞기, 터치로 뜻/예문 공개 후 다음 단어로 진행
- 계정 간 데이터 분리 (Supabase Row Level Security)

## 아이디 계정 참고

- 비밀번호는 최소 8자입니다. 이메일 주소를 받지 않으므로 비밀번호 재설정은 셀프서비스로 제공되지 않습니다. 관리자가 Supabase Auth에서 재설정해야 합니다.
- 회원가입 시 아이디가 Supabase Auth 내부의 `@voca.invalid` 주소로 변환됩니다. 이 가상 주소로 메일을 발송하지 않습니다.
- 기존 이메일 인증으로 만들어진 계정과 그 계정의 단어 데이터는 새 아이디 계정으로 자동 이전되지 않습니다. 기존 데이터를 보존해야 하면 계정 연결/이전 작업이 별도로 필요합니다.
