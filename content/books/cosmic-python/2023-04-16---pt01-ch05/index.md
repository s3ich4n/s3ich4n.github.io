---
title: "파이썬으로 살펴보는 아키텍처 패턴 (5)"
date: "2023-04-16T03:26:01.000Z"
template: "post"
draft: false
slug: "/books/docker/2023-04-16-pt01-ch05"
category: "books"
tags:
  - "ddd"
  - "books"
  - "backend"
  - "python"
description: "파이썬으로 살펴보는 아키텍처 패턴을 읽고 이해한 내용을 작성합니다. 챕터 5, 높은 기어비와 낮은 기어비의 TDD에 대한 내용입니다."
socialImage: { "publicURL": "./media/universe.jpg" }
---

이 내용은 "파이썬으로 살펴보는 아키텍처 패턴" 을 읽고 작성한 내용입니다. 블로그 게시글과, 작성한 코드를 함께 보시면 더욱 좋습니다.

5장은 해당 코드를 살펴봐주세요. [코드 링크](https://github.com/s3ich4n/cosmicpython-study/tree/main/pt1/ch05)

# 5장 **TDD in High Gear and Low Gear**

기어비가 뭔소린가 했는데 걍 1단 2단 … 그거였음. 스틱 몰 때의 그것.

4장까지 오면서 서비스계층으로 작동하는 애플리케이션에 필요한 오케스트레이션 책임을 좀 나눴다. 서비스 계층을 씀으로 인해 유스케이스와 워크플로우를 명확히 나눌 수 있었다.

이를 통해 4.5.1에서 말한 아래 내용을 점검할 수 있다:

1. 저장소에서 객체를 가져온다
2. 애플리케이션이 아는 세계를 바탕으로 요청검사/검증(assertion) 한다
3. 도메인 서비스를 호출한다
4. 모두 정상실행했다면 변경된 상태를 저장/업데이트 한다

현재 단위테스트는 저수준에서 작동하며 모델에 직접 작용한다. 5장에서는 이런 테스트를 보다 상위 계층으로 끌어올려본다. 이때 해당하는 트레이드오프와 더 많은 일반적 테스트 지침을 살펴보자.

# 5.1 테스트 피라미드는 어떻게 생겼나?

```bash
(cosmic-python-py3.10) C:\cosmic_python\pt1\ch05>pytest --collect-only -qq
pt1/ch05/tests/e2e/test_app.py: 4

pt1/ch05/tests/integration/test_repository.py: 4

pt1/ch05/tests/unit/test_allocate.py: 4
pt1/ch05/tests/unit/test_batches.py: 7
pt1/ch05/tests/unit/test_services.py: 4
```

그래도 피라미드처럼 생기긴 했구나…

# 5.2 도메인 계층 테스트를 서비스 계층으로 옮겨야하나?

한 단계 더 나아가면…

서비스 계층에 대해 소프트웨어를 테스트하기 때문에 더이상 도메인 모델 테스트가 필요없다. 대신 1장에서 작성한 도메인 레벨의 테스트를 서비스 계층에 대한 테스트로 재작성한다.

## 추상화를 한 단계 끌어올리자!

### 이 코드를…

```python
def test_prefers_current_stock_batches_to_shipments():
    in_stock_batch = Batch("in-stock-batch", "RETRO-CLOCK", 100, eta=None)
    shipment_batch = Batch("shipment-batch", "RETRO-CLOCK", 100, eta=tomorrow)
    line = OrderLine("oref", "RETRO-CLOCK", 10)

    allocate(line, [in_stock_batch, shipment_batch])

    assert in_stock_batch.available_quantity == 90
    assert shipment_batch.available_quantity == 100
```

### 대충 이런 식으로…

```python
@pytest.mark.asyncio
async def test_prefers_current_stock_batches_to_shipments():
    in_stock_batch = model.Batch("in-stock-batch", "RETRO-CLOCK", 100, eta=None)
    shipment_batch = model.Batch("shipment-batch", "RETRO-CLOCK", 100, eta=tomorrow)
    repo = FakeRepository([in_stock_batch, shipment_batch])

    line = model.OrderLine("oref", "RETRO-CLOCK", 10)
    await services.allocate(line, repo, FakeSession())

    assert in_stock_batch.available_quantity == 90
    assert shipment_batch.available_quantity == 100
```

## 이걸 왜 함?

테스트로 시스템을 보다 쉽게 바꿀 수 있다는 것은 동의한다. 체감도 해봤으니까.

하지만 저자는 도메인 모델에 의해 시간을 너무 허비하는 경우가 있을 수 있다고 한다. 코드베이스 하나 고치면 수십 수백개의 제반기능 테스트가 바뀔 수도 있으니까…

테스트의 목적을 잘 생각해보자.

- 변하면 안 되는 시스템의 특성을 강제로 유지하기 위해 사용한다
- E.g.,
    - `200` 리턴이 계속 뜨는지?
    - DB 세션이 커밋하고 있는지?
    - 도메인 로직이 여전히 도는지?

클린코드에서는 내게 [뭐라 말했는지](https://blog.s3ich4n.me/books/clean-code/2023-02-10-pt09#%EA%B9%A8%EB%81%97%ED%95%9C-%ED%85%8C%EC%8A%A4%ED%8A%B8-%EC%BD%94%EB%93%9C-%EC%9C%A0%EC%A7%80%ED%95%98%EA%B8%B0) 떠올려보자

- 깨끗한 테스트코드?
- 테스트의 존재의의는 실제 코드 점검
⇒ 이는 설계와 아키텍처를 깨끗하게 보존하는 열쇠!
    - 이게 있어야 로직 고치기가 쉽다

잘 생각해보자. 프로그램을 바꾸면 테스트가 깨진다. 코드의 설계를 바꿀 때 코드에 의존하는 테스트가 실패한다는 뜻이다.

책은 서비스 계층이 시스템을 다양한 방식으로 조정할 수 있는 API를 형성하게 된다는 점을 시사한다. API에 대해 테스트를 짜면 도메인 모델 리팩토링 시 변경해야하는 코드를 줄일 수 있다. 서비스 계층 테스트만 하도록 제한하고, 모델 객체의 ‘사적인’ 속성이나 메소드, 테스트가 직접 상호작용하지 못하게 하면 모델객체를 보다 자유롭게 리팩토링할 수 있다.

> 테스트에 넣는 코드는 하나하나가 본드방울 같아서 시스템을 특정 모양으로 만든다.
테스트가 저수준이면 시스템 각 부분을 바꾸기가 어려워진다.
> 

# 5.3 어떤 종류의 테스트를 싸야할까?

“그럼 죄다 다시 짜요?” 할 것이다. 이 질문에 답하기 위해선 결합과 설계 피드백 사이의 트레이드오프를 반드시 이해해야한다.

![]([https://www.cosmicpython.com/book/images/apwp_0501.png](https://www.cosmicpython.com/book/images/apwp_0501.png))

익스트림 프로그래밍(XP)에서는 ‘코드에 귀기울여라(listen to the code)’ 라고 한다. (?) 테스트를 짤 때, 테스트 대상인 코드가 쓰기 어려운 코드인걸 발견하거나 코드 냄새를 맡을 수도 있다. 이러면 리팩토링하고 설계를 재점검 한다.

하지만 대상 코드와 더 밀접하게 연관되어 작업할 때만 이런 피드백을 받을 수 있다. HTTP API에 대한 테스트는 훨씬 더 높은 수준의 추상화를 사용하므로 객체의 세부설계에 대한 피드백을 제공하지 않는다.

전체 앱을 다시짜도 URL, 요청형식을 바꾸는게 아니면 앱은 HTTP 테스트를 계속 통과한다. 이러면 DB 스키마 변경 등의 대규모 변경 시에도 코드가 안망가지겠다 하는 자신감이 붙는다.

이런 스펙트럼의 반대쪽에는 1장같은 테스트가 있다. 이런 테스트가 있으면 객체에 대한 이해증진에 크게 도움이 된다. 도메인 언어가 곧 테스트니까.

이런 수준에서의 테스트는 새 행동양식을 ‘스케치’ 하고 코드가 어떻게 생겼는지를 살펴볼 수 있다. 하지만 이런 테스트는 특정 구현과 긴밀하게 연관되어있어서 코드 디자인을 개선하려면 이런 테스트를 다른 테스트로 대치하거나 바꿔야 한다.

# 5.4 High and Low Gear

새 기능을 추가하거나 버그를 수정할 때 도메인 모델을 크게 바꿀 필요가 없다. 도메인 모델을 바꿔야 하는 경우 더 낮은 결합과 더 높은 커버리지를 제공하므로 서비스에 대한 테스트를 작성하는 게 더 좋다.

`add_stock`, `cancel_order` 같은 함수를 만드는 경우, 서비스 계층에 대한 테스트를 짜면 좀 더 빠르게 결합이 적은 테스트를 작성할 수 있다.

새 플젝을 시작하거나 아주 어려운 특정 문제를 다뤄야 한다면 도메인 모델에 대한 테스트를 다시 짜서, 이를 통한 피드백을 얻고 의도를 더 명확하게 설명하는 “살아있는” 문서(테스트코드!)를 얻을 수 있다.

이래서 필자는 저단기어, 고단기어라는 메타포(은유)를 사용했다. low gear로 빠르게 움직이기 시작하면 high gear로 바꿔서 더 빠르게 움직일 수 있다. 위험해서 속도를 낮춰야되면 기어비를 낮춰야된다.

# 5.5 서비스 계층 테스트를 도메인으로부터 분리하기

서비스 테스트에는 도메인 모델에 대한 의존성이 있다. 테스트 데이터 설정 및 서비스 계층 함수 호출을 위해 도메인 객체를 쓰기 때문이다.

이를 위해 원시타입만 사용하도록 다시 짜야한다.

서비스 안의 `allocate()` 함수부터 시작하자.

테스트가 함수를 호출하면서 원시타입을 쓰게 리팩토링 후… 5.5.1을 통해 헬퍼 함수나 픽스처로 도메인 모델을 내보내는 추상화를 한다. → 이러면 테스트의 의존성은 최대한 떨어뜨릴 수 있다.

해당 서비스 로직에서는 모델을 쓰도록 한다!

## 5.5.1 바꿔보자 (1)

### 테스트가 이렇게 풀리고

```python
class FakeRepository(AbstractRepository):
    ...

    @staticmethod
    def for_batch(ref, sku, qty, eta=None):
        return FakeRepository([
            model.Batch(ref, sku, qty, eta=None),
        ])

# for_batch 같은 팩토리 함수를 만들어서 모든 도메인 의존성을 픽스처에 옮긴다!
@pytest.mark.asyncio
async def test_returns_allocation():
    repo = FakeRepository.for_batch("b1", "COMPLICATED-LAMP", 100, eta=None)
    result = await services.allocate("o1", "COMPLICATED-LAMP", 10, repo, FakeSession())
    assert result == "b1"
```

### 본 로직은 이렇게 풀린다

```python
async def allocate(
        orderid: str,
        sku: str,
        qty: int,
        repo: repository.AbstractRepository,
        session,
) -> str:
    """ batches를 line에 할당한다.

    FYI,
        의존성 역전 원칙이 여기 들어감에 유의!
        고수준 모듈인 서비스 계층은 저장소라는 추상화에 의존한다.
        구현의 세부내용은 어떤 영속 저장소를 선택했느냐에 따라 다르지만
        같은 추상화에 의존한다.

    :param orderid:
    :param sku:
    :param qty:
    :param repo:
    :param session:
    :return:
    """
    line = model.OrderLine(orderid, sku, qty)
    batches = await repo.list()

    if not is_valid_sku(line.sku, batches):
        raise InvalidSku(f'Invalid sku {line.sku}')

    batchref = model.allocate(line, batches)
    await session.commit()

    return batchref
```

## 5.5.2 추가해보자 (2)

재고 추가 서비스(`add_batch`)를 만든다고 하자. 서비스 계층의 공식적인 유스케이스를 쓰는 서비스 계층 테스트 작성이 가능하다. 도메인에 대한 의존관계 또한 떼어낼 수 있다.

> 저자의 팁

일반적으로 서비스 계층 테스트에서 도메인 계층에 있는 요소가 필요하다면
이는 서비스 계층이 완전하지 않다는 사실을 보여주는 지표*일 수 있다*(*it may be an indication that your service layer is incomplete)*.
> 

### 테스트는 이렇게

```python
@pytest.mark.asyncio
async def test_add_batch():
    repo, session = FakeRepository([]), FakeSession()
    await services.add_batch("b1", "CRUNCHY-ARMCHAIR", 100, None, repo, session)

    assert await repo.get("b1") is not None
    assert session.committed
```

### 서비스 코드는 이렇게

```python
async def add_batch(
        ref: str,
        sku: str,
        qty: int,
        eta: Optional[date],
        repo: repository.AbstractRepository,
        session,
):
    await repo.add(model.Batch(ref, sku, qty, eta))
    await session.commit()
```

진짜 최소한의 사용만을 했다.

저자가 원하는 것은 **모든** 서비스 계층 테스트에 대해 의존성 없이 오직 서비스 자체와 원시타입만을 이용해서 짜는 것이다.

> 저자는 `add_batch` 가 필요할 수도 있으니 만들어두고 테스트에서 의존성도 떼어냈다. 그래서 언제든지 리팩토링할 수 있는 것이다.
> 

# 5.6 E2E 테스트에 도달할 때 까지 계속 개선하기

`add_batch` 를 추가해서 서비스 계층 테스트를 모델에서 분리할 수 있었다.

배치를 추가하는 API 엔드포인트를 추가하면 `add_stock` 같은 픽스처를 없앨 수도 있다.

---

이건 좀 신박하네…. 어차피 필요한 기능이다 싶어서 과감하게 넣은건가? 이러면 테스트용 API 이런식인가?

---

이거 정상적으로 돌리는건 UoW 되고나서 다시 할거다.

하드코딩 SQL을 API콜로 바꾸면 API를 제외한 의존성을 분리완료했다는 의미가 된다(!).

# 5.7 마치며

서비스 계층을 만들면 대부분의 테스트를 단위 테스트로 옮기고 건전한 테스트 피라미드(*a healthy test pyramid*)를 만들 수 있다.

여러 유형의 테스트를 작성하는 간단한 규칙

1. ‘특성 당 E2E 테스트 하나를 만든다’ 라는 목표를 잡자
    1. 이런 식의 테스트는 HTTP API를 쓸 가능성이 높다. 피처가 잘 작동하는 지 보고, 이에 따라 움직이는 모든 부품이 잘 연결되는지 살펴보는 것이다.
2. 테스트 대부분은 서비스 계층을 사용하여 만드는 것을 권한다.
    1. 이런 식의 테스트는 커버리지, 실행 시간, 효율 사이를 잘 절충하도록 도와준다.
        1. 각 테스트는 어떤 기능의 한 경로를 테스트하고 I/O에 가짜 객체(*fakes for I/O*)를 사용하는 경향이 있다.
    2. 이런 테스트는 모든 edge case를 다루고, 비즈니스 로직의 모든 입력/출력을 테스트해볼 수 있다.
        1. 8장을 보고나서 업데이트 할 것이다. 서로 협력하는 도메인 객체 사이의 저수준 단위 테스트를 제거함으로서 배워보자.
3. 도메인 모델을 사용하는 핵심 테스트를 적게 작성하고 유지하자
    1. 이런 테스트는 커버리지가 작고(좁은 범위를 테스트), 더 깨지기 쉽다. 하지만 이 테스트가 제공하는 피드백이 가장 크다.
    2. 이런 테스트를 서비스 계층 기반으로 바꿀 수 있으면 바로바로 하는 것을 권한다.
4. 오류 처리도 특성으로 취급하자
    1. **이상적인 경우** 앱은 모든 오류가 엔트리포인트까지(나는 FastAPI) 올라와서 처리된다.즉 테스트를 아래와 같이 유지하면 된다는 뜻이다:
        1. 모든 비정상경로를 테스트하는 E2E 테스트 한개
        2. 각 기능의 정상경로만 테스트
