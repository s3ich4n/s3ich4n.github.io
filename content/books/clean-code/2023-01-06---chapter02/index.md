---
title: "클린 코드 스터디 (2): 의미있는 코드"
date: "2023-01-06T22:59:00.000Z"
template: "post"
draft: false
slug: "/books/clean-code/2023-01-06-pt01"
category: "devlog"
tags:
  - "book_review"
  - "code_quality"
description: "2023년 1월부터 시작한 클린 코드 독파 스터디 후, 매 모임 전 준비하는 게시글을 공유합니다. 이 글은 2장, 의미있는 코드에 대해 설명합니다."
socialImage: { "publicURL": "./media/water.jpg" }
---

# 2. 의미있는 코드

의미있는 코드 이름을 붙입시다. 소프트웨어 세상 만사에 다 쓰이는게 이름이잖아요. 그러면 잘 지어봅시다.

## 의도가 분명한 코드

변수, 메소드, 에서 의미가 드러나도록 생각해봅시다. 코드 맥락에 따라, 필요한 내용이 담겨있도록 하는 이름을 유도해봅시다.

### 저의 생각 (1)

인덱스용 `i`, `j` 도 가급적이면 `idx` 처럼 써서, `foreach` 형식의 구문에서도 이해할 수 있게 만들어야할 것입니다.

### 저의 생각 (2)

파이썬에선 매개변수 사용 시, 쓰도록 하고싶을 때, 아래와 같이 사용할 수 있습니다([PEP 3102](https://peps.python.org/pep-3102/)).

사용방법은 아래와 같습니다:

```python
Python 3.7.12 | packaged by conda-forge | (default, Oct 26 2021, 06:08:21)
Type 'copyright', 'credits' or 'license' for more information
IPython 7.34.0 -- An enhanced Interactive Python. Type '?' for help.

In [1]: def test1(
   ...:     body: dict,
   ...:     *,
   ...:     testarg: bool	# 쓸 거면 explicit 하게 호출하기 (PEP 3102)
   ...: ):
   ...:     print(body)
   ...:     print(testarg)
   ...:

In [2]: test1({"b": 1}, True)
---------------------------------------------------------------------------
TypeError                                 Traceback (most recent call last)
<ipython-input-2-b0d6e60260e3> in <module>
----> 1 test1({"b": 1}, True)

TypeError: test1() takes 1 positional argument but 2 were given

In [3]: test1({"b": 1}, testarg=True)
{'b': 1}
True

In [4]: test1({"b": 1}, {"testarg": True})
---------------------------------------------------------------------------
TypeError                                 Traceback (most recent call last)
<ipython-input-4-3f3364c4dbeb> in <module>
----> 1 test1({"b": 1}, {"testarg": True})

TypeError: test1() takes 1 positional argument but 2 were given

In [5]: test1({"b": 1}, **{"testarg": True})
{'b': 1}
True

In [6]: test1({"b": 1}, **{"sdafkjnerfg": True})
---------------------------------------------------------------------------
TypeError                                 Traceback (most recent call last)
<ipython-input-6-b65affa75eff> in <module>
----> 1 test1({"b": 1}, **{"sdafkjnerfg": True})

TypeError: test1() got an unexpected keyword argument 'sdafkjnerfg'

```

## 그릇된 정보를 피하라

- 프로그래밍 업계 전반에서 널리 사용되는 용어, 개발중인 도메인에서 사용하고 있는 용어와 유사한 이름을 다른 뜻으로 사용하지 맙시다.
- 유사한 개념은 유사한 표기법을 사용합시다.

## 의미 있게 구분하라

아래 코드를 살펴봅시다.

```python
def swap_coord(
    self,
    q1: Coord,
    q2: Coord,
) -> None:
    """ 좌표계 Coord을 swap하는 코드다
    """
    q1, q2 = q2, q1
```

뜻은 알겠습니다만, `src`, `dst` 라고 작성하는게 보다 "명확"합니다. 그래도 나은코드를 만들려면? 하는 고민이 필요한 시기라고 할 수 있겠지요.

예를들어 어떤 에러의 Traceback을 보는데, 이런식으로 나왔다고 가정해봅시다.

```python
---------------------------------------------------------------------------
Exception                                 Traceback (most recent call last)
<ipython-input-10-9732aa3334c7> in <module>
----> 1 get_active_account()

<ipython-input-7-4703b8c01446> in get_active_account()
      1 def get_active_account():
----> 2     get_active_accounts()
      3

<ipython-input-8-c779c718bd0e> in get_active_accounts()
      1 def get_active_accounts():
----> 2     get_active_accounts_info()
      3

<ipython-input-9-154e7846498a> in get_active_accounts_info()
      1 def get_active_accounts_info():
----> 2     raise Exception("!")
```

기능을 쫓아갈 때도 보다 "명확한" 이름을 써야, 추후 디버깅하고 기능을 추가할 때도 보다 쫓아가기 쉽겠지요.

## 발음하기 쉬운 이름을 쓰라

한국에서 영어는 제2외국어니까 발음은 사실 그리 문제되지 않는다고 생각합니다. 다만 도메인을 풀 때 *공통적인 단어*에 대한 논의는 필요하다고 생각합니다. 예를 들어, "구분"이라는 단어를 `gubun` 으로 공통적으로 사용할 수도 있을 것입니다. 다같이 프로그래밍을 하는것이니까요.

## 검색하기 쉬운 이름을 사용하라

수업 당 학생 수를 표기하기 위해 `7` 을 상수로 바로 쓰기보단 `MAX_CLASSES_PER_STUDENT` 같은 이름을 붙여서 쓰는편이 좋을 것입니다.

## 인코딩을 피하라

Win32 API 프로그래밍에서 흔히 쓰이던 [헝가리식 표기법](https://en.wikipedia.org/wiki/Hungarian_notation)이 특히 그랬지요. 요즘 강타입 언어들은 더 많은 타입을 지원하고, 컴파일 레벨에서도 이런 문제들을 잡을 수 있고, 클래스와 함수가 점차 작아지는 추세입니다. 파이썬이라도 `mypy` 나 적극적인 타입힌팅을 두는 식으로도 어느정도 대응은 되지요. 그리고 IDE 단에서도 타입에러를 감지합니다. 때에따라 쓸 수 있겠지만, 불필요하겠지요.

### 인터페이스와 구현 클래스?

팩토리 클래스와 구현체 클래스의 이름을 정한다면, 팩토리쪽을 추상화한 이름을 짓는편은 어떨까요? 구현체의 이름에 `Impl` 이라거나 `I` 접두사를 붙이거나 하기보단 어차피 어느 부모를 상속한건지 IDE로도 쫓아갈 수 있으니까요.

## 자신의 기억력을 자랑하지 마라

나만 아는 이름을 하면 남과 함께 일하기 어려우니 자제해야 합니다. 남과 함께 일하기 좋은 변수명을 짓는 방안으로는 어떤게 있을까요?

### 클래스 이름

동사 쓰지말고 명사/명사구로 씁시다.

### 메소드 이름

동사/동사구로 씁시다. getter나 setter, 그외 요소들은 사용하는 언어의 특징을 따릅시다.

### 특이한 이름은 지양할 것

그 당시에만 웃겨서 다시보면 노잼일거에요...

### 한 개념에 한 단어만

추상적 개념 하나에 단어 하나를 선택하고,이를 고수합시다. 일관성있게 유지해서 충분히 유추할 수 있는 코드를 짭시다.

1. 동일한 결과를 기대하는 메소드라면 단일 이름을 씁시다. 클래스마다 `fetch`, `retreive`, `get` 과 같이 **각각 다르게**쓰면 다른 코드를 쫓아가기 어렵습니다.
2. 동일 개념이라면 동일한 이름을 씁시다. 동일 코드 기반에 `controller`, `manager`, `driver` 등을 **섞어 사용하면** 다른 코드를 이해하기 어렵습니다.

## 말장난을 하지 마라

한 단어는 하나의 의미만을 가집시다. 더한다(add) 라는 개념을 확장하고 싶다면 insert나 append 같은 단어를 사용합시다. 코드를 훑어보더라도 이해하기 쉽도록 합시다.

## 해법 영역에서 가져온 이름을 사용하라

**모든** 이름을 도메인에서 따지는 말고, 기술이 주요한 개념이라면 기술이름을 응용하여 명명합시다. VISITOR 패턴을 썼다면 `AccountVisitor` 와 같은 이름을 쓰는것은 어떨까요?

## 문제 영역에서 가져온 이름을 사용하라

그게 아니라면 어지간한 이름은 도메인에서 따옵시다. 그러면 새로 오는 사람이더라도 관련 파트 사람에게 개념을 질문하여 빠른 해답을 끌어올 수 있을 것입니다.

## 의미 있는 맥락을 추가하라

클래스, 메소드, 변수를 통해 로직의 컨텍스트를 유지하다보니, 메소드 하나에 너무 많은 개념이 들어가있나요? 도메인을 풀기 위한 주요 개념이라면 이를 객체화 해봅시다.

객체끼리 메시지를 주고받을 수 있도록 하고 로직을 작게 분리하는 해결책은 어떨까요?

## 불필요한 맥락을 없애라

너무 짧은 이름보다는 긴 이름이 좋습니다만, 의미가 분명한 이름이라면 짧게 가져가서 불필요한 맥락을 빼버립시다.

## 마치면서

좋은 이름은 기억에 오래 남고, 비슷한 이름은 익숙해지기 쉽습니다. 이런 노력을 기울여서 이름에 대한 프로그래머의 생각비율을 최소화 합시다.
