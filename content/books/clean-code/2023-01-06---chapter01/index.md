---
title: "클린 코드 스터디 (1): 깨끗한 코드"
date: "2023-01-06T22:51:00.000Z"
template: "post"
draft: false
slug: "/books/clean-code/2023-01-06-pt01"
category: "devlog"
tags:
  - "book_review"
  - "code_quality"
description: "2023년 1월부터 시작한 클린 코드 독파 스터디 후, 매 모임 전 준비하는 게시글을 공유합니다. 이 글은 1장, 깨끗한 코드에 대해 알아봅니다."
socialImage: { "publicURL": "./media/water.jpg" }
---

# 1. 깨끗한 코드

ChatGPT로 기술 발전이 무섭게 발전하는 지금, 기계가 못하는 것을 할 수 있도록 하기 위해 이 책을 폈습니다. 우리는 기계보다 나은 코드를 짜도록 연마해야할 것입니다.

코드는 요구사항을 표현하기 위한 도구이며, 각 요구사항을 표현하기 위한 언어 또한 늘어나겠지요. 막연한 요구사항을 구체화하고, 이를 잘 풀어내는 것은 (아직은) 인간이 할 수 있는 것입니다. 그런고로, 잘 풀어내는 방법을 배워봅시다.

나쁜코드가 왜 좋지 않은지 이야기해봅시다. 이 글을 읽으시는 모든 분들은 '나쁜 코드를 어떻게 좋게 바꾸지?' 하고 고민하던 때가 있었을 것입니다.

1. 급하다고 막 짠 코드로, '이거 돈다!' 하는게 쌓이면 돌이킬 수 없습니다. 나중에 하자? **나중은 없습니다.** 실용주의 프로그래머에도 이런 말이 나옵니다: '깨진 유리창을 가만 두지 마라'.

2. 이런 나쁜 코드가 쌓이면 팀 생산성이 떨어집니다.

3. 설령 기회를 얻어, 나쁜 코드를 고칠 기회가 오더라도 모두 고치기는 쉽지 않을 것입니다.

4. 나쁜 코드를 유도하는 **나쁜 설계**를 유도하지 않도록 해야합니다. 좋은 설계에서 좋은 코드가 나올 수 있고, 좋은 코드를 유지하는 것 또한 좋은 설계의 일환입니다.

그런 의미로 코드를 잘 짜는 예술(Art)이 있다는 말에 어느정도 동의합니다. 아름다운 코드는 어떤 *감각*이라고 합니다. 아니 코드에 무슨 미학이 있는것도 아니고? 하는 생각이 들었는데, 수퍼스타들의 말을 읽어보니 납득이 됐습니다.

## 이 바닥 슈퍼스타들은...

1. Bjarne Stroustrup, (C++의 아버지)
   1. 우아하고 효율적인 코드
   2. 의존성을 줄이라
   3. 오류를 전략적으로 처리하라
   4. 성능은 최적으로. 그렇다고 원칙없이 잘 돌아가는 코드를 짜면 안됨
   5. 하나의 코드는 하나의 작동을 한다
2. [Grady Booch](https://zetawiki.com/wiki/%EA%B7%B8%EB%9E%98%EB%94%94_%EB%B6%80%EC%B9%98) (Object Oriented Analysis and Design with Application](https://product.kyobobook.co.kr/detail/S000006439884)[1]의 저자)
   1. 단순하고 직접적이다.
   2. 잘 쓴 문장처럼 읽힌다.
   3. 설계자의 의도가 바로 드러난다.
   4. 명쾌한 추상화와 제어문으로 가득하다.
3. Dave A. Thomas(aka. "Big" Dave Thomas) (OTI의 창립자이자 이클립스 전략의 Godfather)
   1. 안 짠 사람도 읽기 쉽고 고치기 쉽다.
   2. 유닛 테스트부터 인수 테스트까지 다 있다.
   3. 의미 있는 이름이 붙는다.
   4. 코드를 통해 목적을 달성하는 방법은 명확한 하나만 제공된다.
   5. API는 concise하다.
   6. 어떤 면에서는 문학적이다. 모든 정보를 코드로 풀 수 없기 때문이다. → 사람이 읽기 쉬운 코드라는 뜻
4. Michale Feathers ([Working Effectively with Legacy Code](https://www.amazon.com/Working-Effectively-Legacy-Michael-Feathers/dp/0131177052)[2] 의 저자)
   1. 손댈 곳이 없어보이는 코드를 짜자
   2. 주의깊게 보이는 코드
5. Ron Jeffries (Extreme Programming Installed, Extreme Progreaaming Adventure in C#의 저자)
   1. 모든 테스트를 통과한다
   2. 중복코드가 없다
   3. 시스템 내 모든 설계 아이디어를 표현한다
   4. 클래스, 메소드, 함수를 최소한으로 한다
6. Ward Cunningham (위키의 창시자, 익스트림 프로그래밍의 공동 창시자, OO의 정신적 지주)
   1. 루틴대로 도는 코드 → 의도가 명확한 코드
   2. 문제를 풀기위해 보이는 코드
7. Robert C. Martin (aka. 밥 아저씨) (이 책의 저자)
   1. 앞으로의 내용은 책을 보면 알 것
   1. 절대적인 것은 없으나, 상황에 맞는 기술과 기법을 익히길 바람

## 코드작성에 대한 태도

- Javadoc에는 `@author` 필드가 있습니다. 우리는 수차례 코드를 읽고 씁니다. 좋은 글을 쓰기 위한 작가로서의 책임감을 가질 필요가 있습니다.
- 보이스카우트 규칙을 기억하세요.
  - _'캠프장은 처음 왔을 때보다 더 깨끗하게 하고 나갈 것.'_
  - 이는 '처음 왔을 때보다 *더 나은 세상*을 만들고 떠나려 노력하라. (후략)' 라는 말에서 나왔다네요. 낭만이 있습니다...

# 논외로

- [클린 코드 같은 건 없다!](https://www.steveonstuff.com/2022/01/27/no-such-thing-as-clean-code) 하는 당찬 제목이 있던데, 읽어보면 이 말입니다.

  - 업계마다 원하는게 다르고, 그에 따라 간결한 코드를 짜는 방법은 _모두에게 다르게 적용됩니다_.
  - 때에 맞는 기술을 잘 선택해야 _깨끗하다_ 할 수 있습니다.

- 원작자의 마지막 멘트로 이 글을 마무리합니다.

> Hopefully I can convince you that you don’t really need clean code, you need `_____` code. It’s up to you to fill in that blank with words that describe what your project requires.

---

[1]: [이 링크](https://soniacomp.medium.com/%EA%B0%9D%EC%B2%B4%EC%A7%80%ED%96%A5%EC%A0%81-%EB%B6%84%EC%84%9D%EA%B3%BC-%EB%94%94%EC%9E%90%EC%9D%B8-object-oriented-analysis-and-design-%EC%86%8C%EA%B0%9C-part-1-%EB%B2%88%EC%97%AD-67ff58fd26c9)를 참고하십시오. UML을 만든 사람 중 하나이며, 객체간의 메시지 교환, 책임, 협업과 같은 요소가 있어서 객체지향의 사실과 오해, 오브젝트에서도 언급이 되었을 것입니다.

[2]: 이 링크를 참조하십시오.
