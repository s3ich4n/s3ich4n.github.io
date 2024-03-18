---
title: "단위 테스트 (3)"
date: "2023-07-01T00:44:02.000Z"
template: "post"
draft: false
slug: "/books/unit-testing/2023-07-01-pt01-ch03"
category: "books"
tags:
  - "book_review"
  - "code_quality"
description: "단위 테스트 를 읽고 이해한 내용을 작성합니다. 챕터 3, 단위 테스트 구조에 대한 내용입니다."
socialImage: { "publicURL": "./media/testcode.png" }
---

이 내용은 "단위 테스트" 를 읽고 작성한 내용입니다. 블로그 게시글과, 작성한 코드를 함께 보시면 더욱 좋습니다.

3장은 해당 코드를 살펴봐주세요. [코드 링크](https://github.com/s3ich4n/unit-testing-101/tree/main/pt1/ch03)

Chapter 3. 단위 테스트 구조

> 커맨드로 테스트를 직접 실행하기 위해선 현재 디렉토리로 이동한다.
>   `cd pt1/ch03`

---

# 들어가며

단위 테스트의 구조 살펴보기
- Arrange
- Act
- Assert

단위테스트 명명법 살펴보기
- 관행 타파 방안
- 더 나은 방안 제시

단위테스트 근소화에 도움되는 라이브러리의 특징 살펴보기

# 3.1 단위 테스트 구성하는 방법

## 3.1.1 Arrange-Act-Assert 패턴 사용

준비(_Arrange_), 실행(_Act_), 검증(_Assert_)의 세 가지 패턴을 사용하여 작성하는 것을 의미한다. 다음 클래스를 테스트한다고 생각해보자.

```python
class Calculator:
    def sum(first: double, second: double) -> double:
        return first + second
```

그렇다면 테스트코드는 아래와 같이 이루어질 것이다:

```python
def test_sum_of_two_numbers():
    # Arrange
    first = 10
    second = 20
    calc = Calculator()

    # Act
    result = calc.sum(first, second)

    # Assert
    assert 30 == result
```

해당 패턴은 균일한 구조를 가지므로 일관성이 있다. 이것이 큰 장점이다.

- Arrange: SUT 과 해당 의존성을 원하는 상태로 만든다
- Act: SUT에서 메소드를 호출하고 준비된 의존성을 전달한다. 출력값이 있으면 이를 캡처한다
- Assert: 결과를 검증한다. SUT와 협력자의 최종 상태, SUT가 협력자에 호출한 메소드 등으로 표시될 수 있다.

> Given-When-Then 패턴?
>
> - Given: Arrange section과 유사
> - When: Act section과 유사
> - Then: Assert section과 유사
>
> 두 패턴에 차이는 없으나, 비기술자들과 공유하는 테스트에 좀 더 적합하다.

처음 테스트를 작성할 때, 이런 식으로 윤곽을 잡으면 좋다.
- 특정 동작이 무엇을 해야하는지에 대한 목표를 생각하며 시작한다 → assert 문으로 시작하는 사고를 해보자
- 뭘 해야할지 설계되어있으면 Arrange 문부터 구상해보자

## 3.1.2 여러 개의 AAA sections 피하기

여러 동작단위를 테스트하지 말고 하나씩 하라. 하나 이상을 하면 통합 테스트다(2장 참고). 여러 동작단위가 있는 코드는 여러 단일 코드가 존재하는 코드로 리팩토링하라

실행이 하나면 아래 이점이 생긴다
- 테스트를 단위 테스트의 범주에 있게 한다
- 쉽고 빠르고 이해하기 쉽다

통합 테스트에선 여러 section이 있을 수 있지만 이를 빠르게 하려면 단일 테스트를 여러 개 모으는 방법이 있다.

## 3.1.3 테스트 내 `if` 문 피하기

`if`문이 있는 테스트도 안티패턴이다.

- if문은 테스트가 한 번에 너무 많은 것을 검증한다는 표시다 → 여러 테스트로 나누어야 한다
- 이런 테스트는 차라리 여러 테스트로 나누는 것이 좋다(통합 테스트 포함)

## 3.1.4 각 section은 얼마나 커야하나? 

### Arrange가 크면?

별도의 private 메소드, 팩토리 클래스로 도출하는 편이 좋다. 이를 위해 Object mother 패턴과 Test Data Builder패턴을 고려할 수 있다.

### Act section이 한 줄 이상인 경우를 경계하기

Act section은 보통 한 줄이다. 이 이상이면 SUT의 public API를 의심해야 한다.

- good case: 깔끔하게 떨어짐

```python
def test_purchase_succeeds_when_enough_inventory():
    # Arrange
    store = Store(Product("Shampoo", 10))
    customer = Customer()

    # Act
    success = customer.purchase(store, Product("Shampoo", 5))

    # Assert
    assert success is True
    assert 5 == store.item.count
```

- bad case
    - 캡슐화를 깨면서까지 테스트하면 안 된다.
    - 단일 작업을 수행하는 데 여러 메소드를 호출해야 한다는 점
      
      → 불변 위반(_invariant violation_), 캡슐화가 깨짐.
      
      캡슐화를 깨지 않도록 코드를 작성할 것!

```python
def test_purchase_succeeds_when_enough_inventory():
    # Arrange
    store = Store(Product("Shampoo", 10))
    customer = Customer()

    # Act
    is_available = store.has_enough_inventory(Product("Shampoo", 5))
    success = customer.purchase(store, Product("Shampoo", 5))

    # Assert
    assert is_available is True
    assert success is True
    assert 5 == store.item.count
```

## 3.1.5 Assert section에는 얼마나 많은 `assert`가 있어야 하나?

단위 테스트의 단위는 "동작"의 단위다. 동작은 여러 결과를 낼 수 있으므로, 그 결과를 하나의 테스트에서 검증하는 것은 문제없다.

다만 너무 많은 assert 구문은 문제가 된다. 만약 이렇다면, 추상화가 제대로 안 되어있는지 생각해볼 수 있다.

이를 해결하기 위해 동등 멤버(*equality member*)를 정의하는 것이 좋다. (파이썬이라면 `__eq__()` 매직 메소드를 객체별로 구현하는 뜻)

## 3.1.6 종료 단계는?

보통 그런 teardown은 별도 메소드로 표현하는 것이 좋다.

다만 단위 테스트에서는 teardown을 보통 필요로 하지 않는다.

## 3.1.7 테스트 대상 시스템 구별하기

SUT는 테스트에서 중요하다. 애플리케이션에서 호출하려는 지점에 대한 엔트리포인트이기 때문이다. "동작"은 여러 클래스에서 걸칠 수 있지만, 엔트리포인트는 단 하나일 수 밖에 없다.

즉, SUT를 의존성과 구분하는 것이 좋다. SUT가 많으면 테스트 대상을 찾는데 시간을 너무 많이 들일 필요가 없다. 정 헷갈리면 Arrange 할 때, 이름을 그냥 `sut` 로 붙여버리면 된다.

```python
def test_sum_of_two_numbers():
    # Arrange
    first = 10
    second = 20
    sut = Calculator()      # 이런 식으로!

    # Act
    result = sut.sum(first, second)

    # Assert
    assert 30 == result
```
## 3.1.8 Arrange-Act-Assert 주석 떼어내기

테스트의 어떤 부분이 Arrange-Act-Assert 인지 구별을 쉽게 하는 것은 중요하다.

이해하기 쉬운 테스트라면 굳이 주석을 달지 말고 개행으로 처리하라.
통합 테스트 등의 복잡한 테스트라면 Arrange-Act-Assert 주석을 달아주는 편이 좋다.

```python
#
# 이해하기 쉬운 퀘스트면 개행으로만 구별!
#
def test_sum_of_two_numbers():
    first = 10
    second = 20
    sut = Calculator()

    result = sut.sum(first, second)

    assert 30 == result
```

# 3.2 xUnit 테스트 프레임워크 살펴보기

- `setUp()`, `tearDown()` 구성이 있고 테스트코드를 꾸리는게 xUnit 테스트 형식이라고 한다. 파이썬의 빌트인 테스팅 프레임워크 `unittest` 가 해당 구조를 따른다.
- `pytest` 는 fixture 기반으로 테스트의 `setUp`, `tearDown`을 구성할 수 있다.
    - 예를 들면 이런 식으로...
    ```python
    @pytest.fixture
    def fixture123():
        # yield 상단 구문은 setUp으로 구성가능
        yield "test data"
        # yield 하단 구문은 tearDown으로 구성가능

    def test_fixture(fixture123):
        assert "test data" == fixture123
    ```
    - fixture의 반복을 피하기 위해 `conftest.py` 파일을 구조화할 수도 있고, fixture의 scope 또한 지정해줄 수 있다.

# 3.3 테스트 간 테스트 픽스처 사용

테스트코드도 코드 재사용을 수행할 수 있다. 그를 위한 도구 중 하나가 픽스처이다.

이 책에서 픽스처는 **테스트 실행 대상 객체**를 의미한다. 테스트 전에 원하는 고정적 상태를 유지하는 역할을 한다.

픽스처를 재사용하는 첫 번째 방법은 아래와 같다. (아래 방안으로는 사용하지 말자)

```python
class TestCustomer:
    store = Store(Product("Shampoo", 10))
    sut = Customer()

    def test_purchase_succeeds_when_enough_inventory(self):
        success = self.sut.purchase(self.store, Product("Shampoo", 5))

        assert success is True
        assert 5 == self.store.item.count

    def test_purchase_fails_when_not_enough_money(self):
        success = self.sut.purchase(self.store, Product("Shampoo", 15))

        assert success is False
        assert 10 == self.store.item.count
```

테스트는 아래 명령으로 구동한다:

> `pytest test\test_03_high_coupling.py`

```shell
======================================================= test session starts ========================================================
platform win32 -- Python 3.10.11, pytest-7.4.0, pluggy-1.2.0
rootdir: C:\unit_testing\pt1\ch03
plugins: cov-4.1.0, mock-3.11.1
collected 2 items                                                                                                                    

test\test_03_high_coupling.py .F                                                                                              [100%]

============================================================= FAILURES ============================================================= 
______________________________________ TestCustomer.test_purchase_fails_when_not_enough_money ______________________________________ 

self = <test_03_high_coupling.TestCustomer object at 0x000001DB3F6A11E0>

    def test_purchase_fails_when_not_enough_money(self):
        success = self.sut.purchase(self.store, Product("Shampoo", 15))

        assert success is False
>       assert 10 == self.store.item.count
E       AssertionError: assert 10 == 5
E        +  where 5 = Product(merch='Shampoo', count=5).count
E        +    where Product(merch='Shampoo', count=5) = <test_03_high_coupling.Store object at 0x000001DB3F6A0F40>.item
E        +      where <test_03_high_coupling.Store object at 0x000001DB3F6A0F40> = <test_03_high_coupling.TestCustomer object at 0x000001DB3F6A11E0>.store

test\test_03_high_coupling.py:59: AssertionError
===================================================== short test summary info ====================================================== 
FAILED test/test_03_high_coupling.py::TestCustomer::test_purchase_fails_when_not_enough_money - AssertionError: assert 10 == 5       
=================================================== 1 failed, 1 passed in 0.08s ====================================================
```

다른 테스트 케이스에 간섭되어 문제가 발생했다!

이런 류의 로직은 두 가지 단점이 있다!

- 테스트 간 결합도가 높아짐
- 테스트 가독성이 떨어짐

## 3.3.1 테스트 간의 높은 결합도는 안티패턴이다

테스트 간 결합도가 높으면, 다른 테스트에 원치않는 실패를 야기한다. 테스트는 서로 격리되어야 한다는 지침을 어기기 때문이다.

테스트에 공유상태를 두는걸 끊어내야함

## 3.3.2 테스트 가독성을 떨어뜨리는 생성자 사용

준비코드를 생성자로 추출하면 테스트 가독성을 떨어뜨린다. 테스트 메소드가 무엇을 해야하는지 이해하려면 다른 클래스의 부분도 봐야한다.

## 3.3.3 더 나은 테스트 픽스처 재사용법

생성자를 쓰는 것은 최선의 방법이라긴 힘들다. 두 번째 방법은 private 팩토리 메소드를 생성하는 것이다.

pytest라면 scope을 좁게 둔 fixture를 테스트별로 주면 좋을 것 같다. 개별 테스트 별로 격리가 된다는 점에서 팩토리 메소드를 두는 것도 나쁘지 않은데, 픽스처로 해결하기 뭣한 부분들(예를 들어 여럿 걸친 conftest에 동시다발저긍로 쓰이는)에서 잘 분리하면 되지 않을까.

대강 이런 코드를 생각해봤다.

```python
@pytest.fixture(
    scope="function",
    name="data",
)
def create_store_with_inventory():
    """ Scope을 function으로 두어, 수행하는 테스트 케이스별로 돌 수 있도록...
    """
    store = Store(Product("Shampoo", 10))
    sut = Customer()

    yield {"store": store, "sut": sut}


class TestCustomer:
    store = Store(Product("Shampoo", 10))
    sut = Customer()

    def test_purchase_succeeds_when_enough_inventory(self, data):
        store = data.get("store")
        sut = data.get("sut")

        success = sut.purchase(store, Product("Shampoo", 5))

        assert success is True
        assert 5 == store.item.count

    def test_purchase_fails_when_not_enough_money(self, data):
        store = data.get("store")
        sut = data.get("sut")

        success = sut.purchase(store, Product("Shampoo", 15))

        assert success is False
        assert 10 == store.item.count
```

테스트는 아래 명령으로 구동한다:

> `pytest test\test_04_using_fixture.py`

```shell
========================================================= test session starts =========================================================
platform win32 -- Python 3.10.11, pytest-7.4.0, pluggy-1.2.0 -- C:\REDACTED\python.exe
cachedir: .pytest_cache
rootdir: C:\pt1\ch03
plugins: cov-4.1.0, mock-3.11.1
collected 2 items                                                                                                                       

test/test_04_using_fixture.py::TestCustomer::test_purchase_succeeds_when_enough_inventory PASSED                                 [ 50%] 
test/test_04_using_fixture.py::TestCustomer::test_purchase_fails_when_not_enough_money PASSED                                    [100%]

========================================================== 2 passed in 0.02s ==========================================================
```

이러면 각 테스트코드 별로 맥락 유지, 결합 제거, 가독성 향상의 이점을 가진다.

테스트 픽스처 재사용 규칙에는 예외가 있다. 모든 테스트에 사용되는 픽스처는 클래스 생성자로 빼는 편이 더 합리적이다.

그런건 scope을 다르게 두면 된다고 생각한다. ([관련 링크](https://docs.pytest.org/en/7.3.x/how-to/fixtures.html#scope-sharing-fixtures-across-classes-modules-packages-or-session))

```python
@pytest.fixture(scope="session")
def smtp_connection():
    # the returned fixture value will be shared for
    # all tests requesting it
    ...
```

상기와 같이 `scope="session"` 으로 두면 모든 테스트에 대해 (정확히는 자신이 속한 모듈부터 모든 하위까지) 적용가능하다.

# 3.4 단위 테스트 명명법

단위 테스트에 표현력이 있는 이름을 붙이는 것 또한 중요하다. 이름을 보고 뭐하는 테스트인지, 어떤 시스템 검증인지 한번에 이해할 수 있기 때문이다.

저자는 일반적으로 쓰이는 명명법 관습을 비판한다. 아래를 보자:

`[테스트 대상 메소드]_[시나리오]_[예상결과]`

- 테스트 대상 메소드: 테스트 중인 메소드 명
- 시나리오: 메소드 테스트 조건
- 예상 결과: 현재 시나리오에서 테스트 대상 메소드에게 기대하는 것

이는 테스트코드의 동작 대신 구현 세부사항에 집중하도록 하므로 도움되지 않는다고 한다. 또한 괜히 복잡하게 이름을 작성하는 것은 테스트 파악에 도움되지 않는다고 비판한다.

`test_sum_of_two_numbers` 와 같은 이름을 상기 명명법으로 바꾸면, `test_sum_twonumbers_returns_sum` 으로 두어야한다.

- 테스트 대상 메소드: `sum`
- 시나리오: 두 개의 숫자
- 예상결과: 두 수의 합

쓸데없이 복잡하게 두기보단 쉬운 말로 풀어야, 도메인 전문가나 프로그래머 모두에게 도움된다. 현실적인 도움이 되도록 쉽게 작성하자.

## 3.4.1 단위 테스트 명명 지침

- 엄격한 명명정책보다 쉬운 이름으로. 복잡한 동작은 코드로 설명되도록.
- 비개발자에게 비즈니스 로직을 설명할 수 있도록 이름을 명명하기.
- 단어는 `_` 로 구별하기.

## 3.4.2 지침에 따른 테스트이름 변경

이름 개선에 대한 예시를 작성해보자

```python
from datetime import (
    datetime,
    timedelta,
)


class Delivery:
    date_time: datetime

    def is_delivery_valid(self):
        return self.date_time >= self.date_time + timedelta(days=1.99)


class TestDelivery:
    def test_isdeliveryvalid_invaliddate_returnsfalse(self):
        sut: Delivery = Delivery()
        past_date: datetime = datetime.now() - timedelta(days=1)
        sut.date_time = past_date

        is_valid = sut.is_delivery_valid()

        assert is_valid is False
```

테스트는 아래 명령으로 구동한다:

> `pytest test\test_05_complex_name.py`

```shell
========================================================= test session starts =========================================================
platform win32 -- Python 3.10.11, pytest-7.4.0, pluggy-1.2.0 -- C:\python.exe
cachedir: .pytest_cache
rootdir: C:\unit_testing\pt1\ch03
plugins: cov-4.1.0, mock-3.11.1
collected 1 item

test/test_05_complex_name.py::TestDelivery::test_isdeliveryvalid_invaliddate_returnsfalse PASSED                                 [100%]

========================================================== 1 passed in 0.01s ==========================================================
```

테스트케이스의 이름을 고쳐보자... 이 정도를 첫 시도라고 할 수 있다!

- `delivery_with_invalid_date_should_be_considered_invalid()`

- 이름이 누구에게든 이해하기 쉽도록 바뀌었다
- SUT의 메소드 이름은 더이상 테스트 이름에 속하지 않는다

> 테스트케이스 이름에 SUT의 메소드 이름을 넣지 마시오
>
> 1. SUT의 메소드 이름이 바뀔지도 모른다
> 2. 동작 대신 코드를 목표로 하면 해당 코드의 구현 세부사항과 테스트 간의 결합도가 높아진다 → 테스트 유지보수성이 떨어짐 (5장서 살펴봄)

테스트케이스로 다시 돌아가보자. 이 테스트케이스의 "무효한 날짜"는 언제인가? 과거의 날짜다. 이는 테스트가 과거의 날짜면 실패함을 시사하도록 바꾸어야 한다.

- `delivery_with_past_date_should_be_considered_invalid()`

좀더 쉬운영어로 갈아보자!

- `delivery_with_past_date_should_be_invalid()`

_should be_ 구문은 안티패턴이다(!). 하나의 테스트는 동작 단위에 대한 단순하고 원자적 사실이기 때문이다. 사실을 기술할 땐 소망, 욕구가 없다. 그렇다면 아래와 같이 바뀐다:

- `delivery_with_past_date_is_invalid()`

기초적인 영문법은 지키자(!)

- `delivery_with_a_past_date_is_invalid()`

이 테스트 케이스는, 테스트 대상의 애플리케이션 동작의 관점 중 하나를 설명한다. "배송가능" 여부는 현재 이후의 날짜여야 한다는 점이다.

# 3.5 매개변수화된 테스트 리팩토링하기

테스트 하나로는 동작을 완벽히 설명하기 힘들다. 각 구성요소는 자체 테스트로 캡처해야한다. 그런데, 상기 구문과 같은 로직을 검증하려면 복수개의 테스트코드가 많이 생겨야한다. 이 때 매개변수화된(_parametrized_) 테스트를 사용하여 반복을 줄일 수 있다. `pytest` 에서는 어떻게 쓸 수 있나 살펴보자.

먼저, 상기 애플리케이션의 날짜 관련 동작은 여러가지 테스트 케이스를 포함하고 있다. 지난 배송일 확인 이외에도 오늘, 내일, 그 이후의 날짜에 대해서도 확인하는 테스트가 필요하다. 이는 아래와 같을 것이다:

- `delivery_for_today_is_invalid()`
- `delivery_for_tomorrow_in_invalid()`
- `the_soonest_delivery_date_is_two_days_from_now()`

이걸 일일이 만들면 길어진다. 그렇다면, 하나의 공통된 이름으로 묶고, 여러 파라미터를 한번에 넣고 테스트한다면 한결 나을 것이다.

```python
class TestDelivery:
    @pytest.mark.parametrize(
            "from_now, expected",
            [(-1, False), (0, False), (1, False), (2, True)]
    )
    def test_can_detect_an_invalid_delivery_date(self, from_now, expected):
        sut: Delivery = Delivery()
        past_date: datetime = datetime.now() + timedelta(days=from_now)
        sut.date_time = past_date

        is_valid = sut.is_delivery_valid()

        assert is_valid == expected
```

이런 식으로 parametrize를 수행해서, 여러 테스트에 대해 케이스 별로 수행해볼 수 있다. 

그리고, 매개변수화된 데이터를 별도로 뺄 수는 없을까? 너저분하게 코드가 나열되어있는 것은 보기 좀 그렇다.

그럴 땐 테스트 데이터를 별도로 마련하고...

```python
testdata = [
    (-1, False),
    (0, False),
    (1, False),
    (2, True),
]
```

...이를 parametrize에 전달한다.

```python
@pytest.mark.parametrize("from_now, expected", testdata)
def test_can_detect_an_invalid_delivery_date2(self, from_now, expected):
    sut: Delivery = Delivery()
    past_date: datetime = datetime.now() + timedelta(days=from_now)
    sut.date_time = past_date

    is_valid = sut.is_delivery_valid()

    assert is_valid == expected
```

상기 테스트들은 아래 명령으로 구동한다:

> `pytest test\test_06-1_parameterized_test.py`

```shell
================================================ test session starts =================================================
platform win32 -- Python 3.10.11, pytest-7.4.0, pluggy-1.2.0 -- C:\REDACTED\python.exe
cachedir: .pytest_cache
rootdir: C:\pt1\ch03
plugins: cov-4.1.0, mock-3.11.1
collected 8 items

test/test_06-1_parameterized_test.py::TestDelivery::test_can_detect_an_invalid_delivery_date[-1-False] PASSED   [ 12%] 
test/test_06-1_parameterized_test.py::TestDelivery::test_can_detect_an_invalid_delivery_date[0-False] PASSED    [ 25%]
test/test_06-1_parameterized_test.py::TestDelivery::test_can_detect_an_invalid_delivery_date[1-False] PASSED    [ 37%] 
test/test_06-1_parameterized_test.py::TestDelivery::test_can_detect_an_invalid_delivery_date[2-True] PASSED     [ 50%] 
test/test_06-1_parameterized_test.py::TestDelivery::test_can_detect_an_invalid_delivery_date2[-1-False] PASSED  [ 62%] 
test/test_06-1_parameterized_test.py::TestDelivery::test_can_detect_an_invalid_delivery_date2[0-False] PASSED   [ 75%]
test/test_06-1_parameterized_test.py::TestDelivery::test_can_detect_an_invalid_delivery_date2[1-False] PASSED   [ 87%] 
test/test_06-1_parameterized_test.py::TestDelivery::test_can_detect_an_invalid_delivery_date2[2-True] PASSED    [100%] 

================================================= 8 passed in 0.09s ==================================================
```

### 주의! pytest의 parametrized 사용법에 대해...

다만, `pytest`의 parametrized 기능을 두줄로 사용하면 `from_now`, `expected`로 나열가능한 모든 경우를 다 사용한다. ($4!$만큼의 테스트 케이스를 수행!)

아래 코드는 아래와 같은 테스트 케이스의 에러가 난다!

```python
class TestDelivery:
    @pytest.mark.parametrize("from_now", [(-1), (0), (1), (2)])
    @pytest.mark.parametrize("expected", [(False), (False), (False), (True)])
    def test_can_detect_an_invalid_delivery_date(self, from_now, expected):
        sut: Delivery = Delivery()
        past_date: datetime = datetime.now() + timedelta(days=from_now)
        sut.date_time = past_date

        is_valid = sut.is_delivery_valid()

        assert is_valid == expected
```

상기 테스트들은 아래 명령으로 구동한다:

> `pytest test\test_06-2_parameterized_test_with_error.py`

```shell
================================================ test session starts =================================================
platform win32 -- Python 3.10.11, pytest-7.4.0, pluggy-1.2.0
rootdir: C:\unit_testing\pt1\ch03
plugins: cov-4.1.0, mock-3.11.1
collected 16 items                                                                                                     

test\test_06-2_parameterized_test_with_error.py ...F...F...FFFF.                                                [100%]

====================================================== FAILURES ====================================================== 
__________________________ TestDelivery.test_can_detect_an_invalid_delivery_date[False0-2] ___________________________ 

self = <test_06-2_parameterized_test_with_error.TestDelivery object at 0x000001A45A3A5180>, from_now = 2
expected = False

(중략)

>       assert is_valid == expected
E       assert True == False

test\test_06-2_parameterized_test_with_error.py:26: AssertionError
__________________________ TestDelivery.test_can_detect_an_invalid_delivery_date[False1-2] ___________________________ 
(
self = <test_06-2_parameterized_test_with_error.TestDelivery object at 0x000001A45A3A53C0>, from_now = 2
expected = False

(중략)

>       assert is_valid == expected
E       assert True == False

test\test_06-2_parameterized_test_with_error.py:26: AssertionError
__________________________ TestDelivery.test_can_detect_an_invalid_delivery_date[False2-2] ___________________________ 

self = <test_06-2_parameterized_test_with_error.TestDelivery object at 0x000001A45A3A5600>, from_now = 2
expected = False

(중략)

>       assert is_valid == expected
E       assert True == False

test\test_06-2_parameterized_test_with_error.py:26: AssertionError
___________________________ TestDelivery.test_can_detect_an_invalid_delivery_date[True--1] ___________________________ 

self = <test_06-2_parameterized_test_with_error.TestDelivery object at 0x000001A45A3A5690>, from_now = -1
expected = True

(중략)

>       assert is_valid == expected
E       assert False == True

test\test_06-2_parameterized_test_with_error.py:26: AssertionError
___________________________ TestDelivery.test_can_detect_an_invalid_delivery_date[True-0] ____________________________ 

self = <test_06-2_parameterized_test_with_error.TestDelivery object at 0x000001A45A3A5720>, from_now = 0
expected = True

(중략)

>       assert is_valid == expected
E       assert False == True

test\test_06-2_parameterized_test_with_error.py:26: AssertionError
___________________________ TestDelivery.test_can_detect_an_invalid_delivery_date[True-1] ____________________________ 

self = <test_06-2_parameterized_test_with_error.TestDelivery object at 0x000001A45A3A57B0>, from_now = 1
expected = True

(중략)

>       assert is_valid == expected
E       assert False == True

test\test_06-2_parameterized_test_with_error.py:26: AssertionError
============================================== short test summary info ===============================================
FAILED test/test_06-2_parameterized_test_with_error.py::TestDelivery::test_can_detect_an_invalid_delivery_date[False0-2] - assert True == False
FAILED test/test_06-2_parameterized_test_with_error.py::TestDelivery::test_can_detect_an_invalid_delivery_date[False1-2] - assert True == False
FAILED test/test_06-2_parameterized_test_with_error.py::TestDelivery::test_can_detect_an_invalid_delivery_date[False2-2] - assert True == False
FAILED test/test_06-2_parameterized_test_with_error.py::TestDelivery::test_can_detect_an_invalid_delivery_date[True--1] - assert False == True
FAILED test/test_06-2_parameterized_test_with_error.py::TestDelivery::test_can_detect_an_invalid_delivery_date[True-0] - assert False == True
FAILED test/test_06-2_parameterized_test_with_error.py::TestDelivery::test_can_detect_an_invalid_delivery_date[True-1] - assert False == True
============================================ 6 failed, 10 passed in 0.26s ============================================
```

# 3.6 검증문 라이브러리를 사용한 테스트 가독성 향상

저자는 테스트 가독성 향상을 위해 [Fluent Assertions](https://github.com/fluentassertions/fluentassertions) 라는 라이브러리를 추천한다.

[파이썬에도 있긴 하지만](https://github.com/csparpa/fluentcheck) 잘 모르겠다.

# Summary

- 모든 단위 테스트는 AAA 패턴을 따라야 한다. 테스트 내에 Arrange, Act, Assert section이 여러 줄이라면 여러 동작 단위를 한 번에 검증한다는 표시다. 이 경우 여러 테스트로 나누는 것이 좋다.
- Act section이 여러 줄이면 SUT의 API에 잠정적인 문제를 의심해야 한다
    - 클라이언트에서도 이런 작업을 항상 같이 수행해야하고, 잠재적으로 코드에 로직버그가 발생할 수 있다. 이는 불변 위반(_invariant violation_)이다. SUT의 캡슐화가 제대로 되어있는지 살펴보아야 한다
- SUT의 이름은 `sut` 로 두고 테스트에서 구별하자. 각 section 별로 `Arrange`, `Act`, `Assert` 형식의 주석을 달거나 빈 줄을 추가하여 논리적으로 읽힐 수 있게 구별하자
- 테스트 픽스처 초기화코드는, 팩토리 메소드 형식으로 사용하자. 테스트 간 결합도를 낮게 유지하기 위함이다
- 테스트 케이스의 이름은 사내 구성원 모두가 이해할 수 있도록 쉽게쓰자
- 매개변수화된(_parametrized_) 테스트 코드가 필요하다면 사용하자
- 검증문 라이브러리를 쓰면 테스트 가독성 향상에 도움이 될 수 있다
