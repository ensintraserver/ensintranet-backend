FROM node:22.18.0

COPY ./package.json /myfolder/
COPY ./yarn.lock /myfolder/
WORKDIR /myfolder/

# 프로덕션 빌드를 위해 모든 의존성 설치
RUN yarn install --frozen-lockfile

# 소스 코드 복사
COPY . /myfolder/

# 기존 dist 폴더 삭제
RUN rm -rf /myfolder/dist

# 빌드
RUN yarn build

# dist/main.js 파일 존재 확인
# RUN test -f /myfolder/dist/main.js && echo "✓ dist/main.js 파일 확인 완료" || (echo "ERROR: dist/main.js 파일을 찾을 수 없습니다!" && exit 1)

# 실행
CMD ["node", "dist/main"]