---
title: "클린 코드 스터디 (5): 형식 맞추기"
date: "2023-01-27T22:51:00.000Z"
template: "post"
draft: false
slug: "/books/clean-code/2023-01-27-pt05"
category: "devlog"
tags:
  - "book_review"
  - "code_quality"
description: "2023년 1월부터 시작한 클린 코드 독파 스터디 후, 매 모임 전 준비하는 게시글을 공유합니다. 이 글은 5장, 형식 맞추기에 대해 살펴봅니다."
socialImage: { "publicURL": "./media/water.jpg" }
---

# 5. 형식 맞추기

프로그래머라면 누구든지 코드는 깔끔하고, 일관적이고, 꼼꼼하기를 바랄겁니다. 포맷을 맞추고 따르면 능률은 자연스레 올라갑니다. 필요하다면 도구를 도입하고, 규칙을 맞출 필요가 있습니다.

## 형식을 맞추는 목적

[코드 컴플리트](https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=114392104) 에서는, [Perception in Chess](https://andymatuschak.org/prompts/Chase1973.pdf) 라는 논문에 나오는 실험을 소개합니다. 다양한 레벨(초급, 중급, 마스터)의 체스 선수에게 여러 방향에서 말의 위치를 기억하게 하는 시험이었습니다. 말이 무작위로 움직인다면 초보자들도 쉽게 기억하지만, 말의 위치가 실제 게임에서 일어날 법한 논리적 순서(일관성, 패턴)을 지킨다면 체스 마스터가 압도적인 능률을 보였습니다.

이처럼, 소프트웨어에서도 업계에서 통용되는 스타일의 코드를 작성한다면 프로그래머들끼리 코드를 보았을 때 논리적 순서를 보다 빠르게 캐치할 수 있을 것입니다.

따라서, 저자는 처음 잡아놓은 구현 스타일과 가독성 수준을 지속적으로 유지해야 스타일과 규율대로 코드가 유지될 것임을 말합니다. 그러면 원활한 소통을 장려하는 코드 형식을 살펴봅시다.

## 적절한 행 길이를 유지하라

책의 도표대로 자바 오픈소스의 파일 길이 분포와 로그배율을 살펴보면 `FitNesse` 의 코드는 평균적으로 65줄, 길면 400줄, 짧으면 6줄입니다. `JUnit`, `Time and Money`의 길이는 500줄을 넘지 않으며, 대다수가 200줄 미만입니다. 일반적으로 큰 파일이 작은 파일보다 이해하기 쉽습니다. 동감합니다!

### 신문기사처럼 작성하라

내용은 두괄식으로, 파일 이름은 헤드라인처럼 씁시다.

### 개념은 빈 행으로 분리

기능 따라서 개행만 해도 보는이가 훨씬 편하게 볼 수 있습니다. 코드의 덩어리를 논리단위대로 보기 쉽게 묶어봅시다.

### 세로 밀집도

비슷한 코드는 가까이 붙여둡시다. 불필요한 주석이 코드끼리 붙어있는 것을 방해하게 하지 맙시다.

### 수직 거리

프로그램을 작성하노라면, 작성한 코드에 대해 이 함수 저 함수 왔다갔다 하느라 헷갈렸던 경험이 있을겁니다. 서로 붙어있는 개념의 코드는 최대한 가까이 둡시다.

## 가로 형식 맞추기

가로로 80자를 넘기지 않는 관습은 적용할만합니다. 120자 정도까지도 용인할 만 합니다만 그 이상 긴 것은 너무 길다는 생각이 듭니다.

솔직히 여기 나오는 규정은 각 언어별로 좋은 포맷팅 기법을 다르는 것이 좋다는 생각이 들었습니다. 파이썬을 즐겨쓰는 분이라면 [PEP 8](https://peps.python.org/pep-0008/) 을 기반으로 한 각종 포매터들이 떠오르실겁니다.

## 팀 규칙

팀에 속한다면 규칙을 따르는 것이 좋겠습니다. 하나의 규칙을 세울 때 최대한 일관적인 생각을 가지고 이를 유지하면, 로직에 집중할 힘이 생길 것입니다.
