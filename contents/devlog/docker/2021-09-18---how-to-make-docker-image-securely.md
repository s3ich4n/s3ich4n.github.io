---
title: '시작부터 배포까지: 도커 패키징의 베스트케이스'
date: '2021-09-18T19:00:00.000Z'
categories: ['devlog']
description: 'PyCon US 2021 발표영상 중, 파이썬 도커 이미지를 만드는 좋은 방법에 대한 동영상을 번역해봤습니다.'
thumbnail: './gwangheungchang.jpg'
---

# DISCLAIMER

이 글은 [0 to production-ready: a best-practices process for Docker packaging](https://www.youtube.com/watch?v=EC0CSevbt9k) 을 읽고 제 나름 번역해본 글입니다. 도움이 되길 바랍니다.

# Table of Contents

1. 일단 돌도록 만든다
2. 보안적 측면을 고려한다
3. CI를 돌린다
4. 정상작동 및 디버깅가능하게 만든다
5. 재생산가능한 빌드를 한다
6. 빌드를 더 빠르게 하고 이미지를 작게 만든다

## 1. 일단 돌리자

```docker
FROM python:3.9-slim-buster
COPY . .
RUN pip install .
ENTRYPOINT ["./run-server.sh"]
```

이러면 일단 돌아는 감

## 2. 보안을 고려하자

1. `root` 로 구동하지 말자!

- public에 배포하기 전엔 보안을 항시 신경쓰자
- 컨테이너가 해야 할 범위를 명확히 정하자
  - 자기 실햄범위를 넘기지 않도록 권한을 주자

1. 보안 업데이트를 하자!

- 도커 이미지는 이뮤터블 아티팩트다. 보안 업데이트는 곧 신규 이미지 배포를 의미한다.
  1. 보안 업데이트와 관련된 디펜던시를 이해한다
     1. 정확히 뭐가 문제인가?
        1. 환경변수 수정같은걸로도 안되는 심각한 사안인가?
  2. 이미지 업데이트
  3. 이미지 리빌드
  4. 앱 재배포

```docker
FROM python:3.8-slim-buster
RUN useradd --create-home appuser
USER appuser

WORKDIR /home/appuser
COPY . .
RUN pip install --user .
ENTRYPOINT ["./run-server.sh"]

```

## 3. 자동화된 빌드/CI

- 이미지를 **매번, 손으로** 빌드하고 싶지 않을거다.
- 다른 팀원들도 이미지를 빌드하기 쉽도록 하고싶을거다.
  - 빌드, CI 시스템과 통합하여 배포하라!

```bash
#!/usr/bin/env bash

#
# Ver 1.
#   브랜치 안 가리고 작업
#

set -euxo pipefail

test.py
docker build -t my_image:latest .  # 혹은 이 과정조차 스크립트로
docker push my_image:latest        # 이것도 마찬가지
```

- 참고)
  - `[set -euxo pipefail` 이 뭔데?](https://zetawiki.com/wiki/%EB%A6%AC%EB%88%85%EC%8A%A4_set_-euxo_pipefail)
- 개발 프로세스에 접목시킨다
  - 회사 내 프로세스와 잘 맞아 떨어지는지 알아봐야함
  - 질문사항
    - 패키징 전에 테스트하나? 후에 하나? 둘 다 하나?
    - 브랜치는 어떻게 관리하나?
    - 패키징이 개발자에게 있어 _병목(bottleneck)_ 인가?

```bash
#!/usr/bin/env bash

#
# Ver 2.
#   브랜치 이름을 기반으로, 태그를 붙여 배포하는 스크립트
#

set -euxo pipefail

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

docker build -t "my_image:$GIT_BRANCH" .
docker push "my_image:$GIT_BRANCH"
```

## 4. 정상작동 및 디버깅 가능하도록...

- 실환경에서 잘 도는걸 기대함... 그리고 에러를 잘 볼 수 있게끔 되기를 바람
- `PYTHONFAULTHANDLER=1` 이라는 옵션을 주면, C 코드내에서의 트레이스백까지 같이 받아볼 수 있게 된다:
  ```bash
  ENV PYTHONFAULTHANDLER=1
  ENTRYPOINT ["python", "program.py"]
  ```
  참고) [https://docs.python.org/ko/3/library/faulthandler.html](https://docs.python.org/ko/3/library/faulthandler.html)
- **조용히** 죽는 원인파악에 좋다
  - matplotlib, DB연결 등...
- 예시

  - pre-compile bytecode
  - 파이썬은 빠른 구동을 위해 `pyc` 확장자로 컴파일을 한다.
  - 이미지에 `.pyc` 파일이 없다면 초기구동이 느려질 수도 있다.

  ```docker
  # (보통은 pip에서 한다) 설치한 코드를 컴파일함
  RUN python -c "import compileall; \
      compileall.compile_path(maxlevels=10)"

  # my_package 디렉토리에 코드를 컴파일한다
  RUN python -m compileall my_package/
  ```

  - 이런 기능이 있으니, 필요한 녀석에 대해 해라

## 5. 재생산성

- 메이저 디펜던시는 쉽게 바뀌지 않는다. 그런데, 시간이 지나면 지날 수록 업데이트가 필요해진다
- 따라서, 재생산가능한 빌드를 하고싶어질 것이다. 이를 통해 통제된 방법으로 업데이트가 가능하다.
  - 좋은 베이스 이미지를 선택하자!
  - 보안업데이트도 해주고 하위호환도 좋은 OS를 고르고 싶을 것임...
  - `python:3.9-slim-buster` 는 Debian Buster 슬림버전을 사용함
- 매 빌드마다 디펜던시를 업데이트하면 재생산성이 떨어진다.
  → 따라서, 디펜던시를 고정시키는 것도 방법. 아래 도구들 고려: - pip-tools - poetry - pipenv - conda-lock
- 업데이트를 하지 않는다면? 오래된 디펜던시가 생기고 위험한 업그레이드를 하게된다.
  →정기적으로(on a regular basis)파이썬 디펜던시 업데이트를 위한 조직적 프로세스가 필요하다.

## 6. 빌드를 더 빠르게, 사이즈는 더 작게

- 위의 과정을 따르면, 비로소 _제대로_ 패키지화 한다고 할 수 있다. 그러면 최적화도 고려해야 한다.
- 시간은 소중하므로, 빌드에 많은 시간을 버리고 싶지 않을 것이다
- 더 작은 이미지일 수록 테스트 구동, 프로덕션 구동을 더 빨리할 수 있다
- Alpine 이미지는 쓰지 말자!
  - 현재(2021년 5월 14일, PyCon US 2021 발표시점) 알파인 리눅스는 PyPI의 precompiled wheel을 사용하지 못한다
  - 그 결과, 모든 라이브러리를 다운받고 직접 컴파일하여 구동해야한다.
    - `pandas`, `matplotlib` 을 포함하고 빌드하면 훨씬 오래걸린다
  - PEP 656이 이를 해결할 지도...

## 끝으로...

- Dockerizing은 단순한 아티팩트 생성만을 말하는건 아니다
  - `Dockerfile` 자체도 필요하고 빌드 스크립트, 환경 등이 필요하다
  - 그렇지만 _"프로세스"_ 또한 필요하다
    - 개발환경과의 상호작용
      - 버전관리, 테스팅, CI 등..
    - 보안 업데이트 프로세스
    - 디펜던시 업데이트 프로세스

## (사족) 추가로?

- [Docker의 멀티-스테이지 빌드](https://docs.docker.com/develop/develop-images/multistage-build/)를 추가해서, 파이썬 빌드같은 스테이지는 따로 빼는게 좋다.

## References

- [https://pythonspeed.com/docker](https://pythonspeed.com/docker)
