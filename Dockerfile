FROM node:22.18.0

COPY ./package.json /myfolder/
COPY ./yarn.lock /myfolder/
WORKDIR /myfolder/

# 프로덕션 빌드를 위해 모든 의존성 설치
RUN yarn install

# 소스 코드 복사
COPY . /myfolder/

# 기존 dist 폴더 삭제
RUN rm -rf /myfolder/dist

# 빌드
RUN yarn build

# 빌드 결과 확인 및 실제 main.js 위치 찾기
RUN echo "=== 빌드 결과 확인 ===" && \
    echo "main.js 파일 찾기:" && \
    find /myfolder/dist -name "main.js" -type f && \
    echo "dist 폴더 구조:" && \
    ls -la /myfolder/dist/ && \
    echo "dist/src 폴더 확인:" && \
    ls -la /myfolder/dist/src/ 2>/dev/null || echo "dist/src 폴더 없음" && \
    echo "dist 루트의 .js 파일:" && \
    find /myfolder/dist -maxdepth 1 -name "*.js" -type f || echo "없음"

# main.js 파일이 실제로 존재하는지 확인
RUN MAIN_FILE=$(find /myfolder/dist -name "main.js" -type f | head -1) && \
    if [ -z "$MAIN_FILE" ]; then \
      echo "ERROR: main.js 파일을 찾을 수 없습니다!" && \
      echo "dist 폴더 전체 구조:" && \
      find /myfolder/dist -type f -name "*.js" | head -30 && \
      exit 1; \
    else \
      echo "✓ main.js 파일 발견: $MAIN_FILE"; \
    fi

# package.json의 start:prod 사용 (이미 올바른 경로로 설정되어 있음)
CMD ["yarn", "start:prod"]