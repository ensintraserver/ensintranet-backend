# Redis 블랙리스트 기능 테스트 가이드

## 📋 테스트 목록

### 1. 로그인 테스트
**목적**: 정상적인 로그인 후 토큰 발급 확인

**단계**:
1. GraphQL Playground에서 `login` mutation 실행
2. AccessToken과 RefreshToken(쿠키) 발급 확인
3. 콘솔 로그에서 토큰 정보 확인

**GraphQL 쿼리**:
```graphql
mutation {
  login(email: "test@example.com", password: "password123")
}
```

**예상 결과**:
- ✅ AccessToken 문자열 반환
- ✅ Set-Cookie 헤더에 refreshToken 설정
- ✅ 콘솔에 "쿠키 설정 완료" 메시지 출력

---

### 2. 로그아웃 테스트
**목적**: 로그아웃 시 토큰이 Redis 블랙리스트에 저장되는지 확인

**단계**:
1. 먼저 로그인하여 AccessToken과 RefreshToken 획득
2. Authorization 헤더에 `Bearer {accessToken}` 설정
3. Cookie에 `refreshToken` 포함 확인
4. `logout` mutation 실행
5. 콘솔 로그 확인

**GraphQL 쿼리**:
```graphql
mutation {
  logout
}
```

**Headers 설정**:
```
Authorization: Bearer {발급받은_accessToken}
Cookie: refreshToken={발급받은_refreshToken}
```

**예상 결과**:
- ✅ 응답: "로그아웃에 성공했습니다. (블랙리스트에 저장된 토큰: AccessToken, RefreshToken)"
- ✅ 콘솔에 다음 로그 출력:
  ```
  ===== 로그아웃 요청 시작 =====
  📋 토큰 추출 결과
  🔐 토큰 검증 중...
  ✅ 토큰 검증 성공
  ⏰ 토큰 만료 시간 정보
  ✅ AccessToken 블랙리스트 저장 완료
  ✅ RefreshToken 블랙리스트 저장 완료
  🔍 Redis 저장 확인
  ```

---

### 3. 로그아웃 후 AccessToken 사용 차단 테스트
**목적**: 로그아웃한 AccessToken으로 API 호출 시 차단되는지 확인

**단계**:
1. 로그인하여 AccessToken 획득
2. 로그아웃 실행 (토큰을 블랙리스트에 등록)
3. 동일한 AccessToken으로 인증이 필요한 API 호출
4. 에러 발생 확인

**GraphQL 쿼리** (예: fetchUser 등 인증이 필요한 API):
```graphql
query {
  fetchUser {
    id
    email
  }
}
```

**Headers 설정**:
```
Authorization: Bearer {로그아웃한_accessToken}
```

**예상 결과**:
- ❌ 에러: "로그아웃된 토큰입니다."
- ✅ 콘솔에 다음 로그 출력:
  ```
  ===== Access Token 검증 시작 =====
  🔍 Redis 블랙리스트 체크 중...
  ❌ 블랙리스트에 등록된 AccessToken입니다!
  ```

---

### 4. 로그아웃 후 RefreshToken 사용 차단 테스트
**목적**: 로그아웃한 RefreshToken으로 토큰 재발급 시 차단되는지 확인

**단계**:
1. 로그인하여 RefreshToken 획득 (쿠키)
2. 로그아웃 실행 (토큰을 블랙리스트에 등록)
3. 동일한 RefreshToken으로 `restoreAccessToken` mutation 실행
4. 에러 발생 확인

**GraphQL 쿼리**:
```graphql
mutation {
  restoreAccessToken
}
```

**Headers 설정**:
```
Cookie: refreshToken={로그아웃한_refreshToken}
```

**예상 결과**:
- ❌ 에러: "로그아웃된 토큰입니다."
- ✅ 콘솔에 다음 로그 출력:
  ```
  ===== 쿠키 수신 =====
  🔍 Redis 블랙리스트 체크 중...
  ❌ 블랙리스트에 등록된 RefreshToken입니다!
  ```

---

### 5. 정상 토큰 사용 테스트
**목적**: 로그아웃하지 않은 정상 토큰은 정상적으로 작동하는지 확인

**단계**:
1. 로그인하여 AccessToken과 RefreshToken 획득
2. 로그아웃하지 않고 AccessToken으로 API 호출
3. 정상 응답 확인

**예상 결과**:
- ✅ 정상 응답 반환
- ✅ 콘솔에 다음 로그 출력:
  ```
  ===== Access Token 검증 시작 =====
  🔍 Redis 블랙리스트 체크 중...
  ✅ 블랙리스트에 없음 - 정상 토큰입니다.
  ✅ 토큰 검증 성공
  ```

---

### 6. Redis 저장 확인 테스트
**목적**: Redis에 실제로 토큰이 저장되었는지 확인

**단계**:
1. Docker 컨테이너에 접속하여 Redis CLI 실행
2. 로그아웃 실행
3. Redis에서 토큰 키 확인

**Docker 명령어**:
```bash
# Redis 컨테이너 접속 (로컬 Redis 사용 시)
docker-compose -f docker-compose.dev.yaml exec my-redis redis-cli

# 또는 Upstash Redis 사용 시 (외부에서)
redis-cli --tls -u rediss://default:AR0eAAImcDI0YzZjN2JmMTU1NzY0YTdjYjZhOWM3YWU4ZjNiNzc5N3AyNzQ1NA@whole-pony-7454.upstash.io:6379
```

**Redis 명령어**:
```redis
# 모든 키 조회
KEYS *

# AccessToken 키 조회
KEYS accessToken:*

# RefreshToken 키 조회
KEYS refreshToken:*

# 특정 키의 값 확인
GET accessToken:{실제_토큰값}

# TTL 확인 (만료까지 남은 시간)
TTL accessToken:{실제_토큰값}
```

**예상 결과**:
- ✅ `accessToken:{토큰}` 키 존재
- ✅ `refreshToken:{토큰}` 키 존재
- ✅ 값이 'accessToken' 또는 'refreshToken'으로 저장됨
- ✅ TTL이 토큰 만료 시간까지 설정됨

---

### 7. 토큰 만료 후 자동 삭제 테스트
**목적**: 토큰 만료 시 Redis에서 자동으로 삭제되는지 확인

**단계**:
1. 로그인하여 AccessToken 획득 (만료 시간 1시간)
2. 로그아웃 실행
3. Redis에서 TTL 확인
4. 시간이 지나면 자동으로 삭제되는지 확인

**참고**: 
- AccessToken은 기본적으로 1시간 후 만료
- RefreshToken은 기본적으로 2주 후 만료
- TTL이 0이 되면 Redis에서 자동 삭제

---

## 🔍 콘솔 로그 확인 포인트

### 로그아웃 시 확인할 로그:
```
===== 로그아웃 요청 시작 =====
📋 토큰 추출 결과
🔐 토큰 검증 중...
✅ 토큰 검증 성공
⏰ 토큰 만료 시간 정보
✅ AccessToken 블랙리스트 저장 완료
✅ RefreshToken 블랙리스트 저장 완료
🔍 Redis 저장 확인
  - AccessToken 저장 확인: ✅ 저장됨
  - RefreshToken 저장 확인: ✅ 저장됨
==============================
```

### 블랙리스트 차단 시 확인할 로그:
```
🔍 Redis 블랙리스트 체크 중...
❌ ============================================
❌ 블랙리스트에 등록된 AccessToken입니다!
❌ 이 토큰은 로그아웃되어 사용할 수 없습니다.
❌ ============================================
```

### 정상 토큰 사용 시 확인할 로그:
```
🔍 Redis 블랙리스트 체크 중...
✅ 블랙리스트에 없음 - 정상 토큰입니다.
✅ 토큰 검증 성공
```

---

## 🐛 문제 해결

### Redis 연결 실패 시
- `.env` 파일의 `REDIS_URL` 확인
- Upstash 사용 시 `rediss://` 프로토콜 사용 확인
- Docker Compose 사용 시 Redis 서비스가 실행 중인지 확인

### 토큰이 블랙리스트에 저장되지 않는 경우
- 콘솔 로그에서 "Redis 저장 확인" 부분 확인
- Redis 연결 상태 확인
- TTL이 0보다 큰지 확인 (만료된 토큰은 저장되지 않음)

### 블랙리스트 체크가 작동하지 않는 경우
- Strategy에서 `CACHE_MANAGER` 주입 확인
- Redis 키 형식 확인 (`accessToken:{token}`, `refreshToken:{token}`)
- 콘솔 로그에서 블랙리스트 체크 로그 확인

---

## ✅ 테스트 체크리스트

- [ ] 1. 로그인 성공 및 토큰 발급 확인
- [ ] 2. 로그아웃 시 Redis에 토큰 저장 확인
- [ ] 3. 로그아웃한 AccessToken으로 API 호출 시 차단 확인
- [ ] 4. 로그아웃한 RefreshToken으로 재발급 시 차단 확인
- [ ] 5. 정상 토큰은 정상 작동 확인
- [ ] 6. Redis에 실제 저장 확인
- [ ] 7. 콘솔 로그 정상 출력 확인
