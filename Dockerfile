# FROM node:16

# COPY ./package.json /myfolder/
# COPY ./yarn.lock /myfolder/
# WORKDIR /myfolder/

# # 프로덕션 빌드를 위해 모든 의존성 설치
# RUN yarn install

# # 소스 코드 복사 및 빌드
# COPY . /myfolder/
# RUN yarn build

# # 프로덕션 모드로 실행
# CMD yarn start:prod

FROM node:22.18.0

COPY ./package.json /myfolder/
COPY ./yarn.lock /myfolder/
WORKDIR /myfolder/

# 프로덕션 빌드를 위해 모든 의존성 설치
RUN yarn install

# 소스 코드 복사 (dist 제외)
COPY . /myfolder/

# 기존 dist 폴더 삭제
RUN rm -rf /myfolder/dist

# 빌드 (에러 확인을 위해 상세 출력)
RUN yarn build 2>&1 | tee /tmp/build.log || (cat /tmp/build.log && exit 1)

# 빌드 후 전체 구조 확인
RUN echo "=== main.js 파일 찾기 ===" && find /myfolder/dist -name "main.js" -type f
RUN echo "=== dist 폴더 구조 ===" && ls -laR /myfolder/dist/ || echo "dist 폴더 없음"

# 빌드 결과 확인 - 여러 가능한 경로 확인
RUN (test -f /myfolder/dist/src/main.js || test -f /myfolder/dist/main.js) || \
    (echo "main.js not found in dist/src/main.js or dist/main.js" && \
     echo "Available files:" && find /myfolder/dist -name "*.js" -type f | head -20 && \
     exit 1)

# 프로덕션 모드로 실행 - 실제 파일 위치에 맞게 수정
CMD ["node", "dist/src/main"]


