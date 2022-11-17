---
title: "pre-commit hook, 나도 한번 써보자 (1)"
date: "2021-06-03T09:00:00.000Z"
template: "post"
draft: false
slug: "/tips/2021-07-11-how-to-use-pre-commit-hook-vol1"
category: "tips"
tags:
  - "pre_commit"
description: "pre-commit hook 말만 들었지 실제로 써보지 못했는데, 이참에 써보고 팀원들에게 공유하기 위해 글을 씁니다. 제 1탄입니다."
socialImage: "./media/pangyo_01.jpg"
---

이 글은 pre-commit hook 을 사용하고 전파하기 위해 작성한 시리즈 글입니다.

## 설치 및 설정하기

1. 작업 환경에 맞게 [pre-commit hook을 설치한다](https://pre-commit.com/#installation)
2. pre-commit 환경을 추가한다. 우선은 제대로 따라해보기 위해 예시만 간략히 써보자.

- 추가할 수 있는 훅의 종류는 [여기](https://pre-commit.com/hooks.html)를 참조한다.

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v2.3.0
    hooks:
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
  - repo: https://github.com/psf/black
    rev: 19.3b0
    hooks:
      - id: black
```

3. 브랜치에 깃 훅 스크립트를 설치한다
   - `pre-commit install`
4. 수동으로 돌려본다
   - `pre-commit run --all-files`
5. 앞으로 매 커밋마다 `pre-commit` 훅이 걸릴 것임. ~~똥같은~~ 구린 코드를 커밋하면 아래와 같은 수정내역이 뜬다!

```yaml
오후 1:54	Commit failed with error
        0 file committed, 5 files failed to commit: feat: pre-commit hook 추가
        Check Yaml...........................................(no files to check)Skipped
        Fix End of Files.........................................................Passed
        Trim Trailing Whitespace.................................................Passed
        black....................................................................Failed
        - hook id: black
        - files were modified by this hook

        reformatted /home/l4in/garage.object/01_객체,설계/01_대충설계한코드/audience.py
        reformatted /home/l4in/garage.object/01_객체,설계/01_대충설계한코드/bag.py
        All done! ✨ 🍰 ✨
        2 files reformatted, 3 files left unchanged.

        mypy.....................................................................Failed
        - hook id: mypy
        - exit code: 2

        01_대충설계한코드 is not a valid Python package name
```

## 제거하기

- pre-commit 훅 삭제는 [다음 링크를 참고](https://pre-commit.com/#pre-commit-uninstall)한다

## 차후 해볼것

- [CI 연동](https://pre-commit.com/#usage-in-continuous-integration)
- 더 없나 찾아보자
