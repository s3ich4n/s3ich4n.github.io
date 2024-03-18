---
title: "파이썬으로 살펴보는 아키텍처 패턴 (9)"
date: "2023-05-06T04:24:59.000Z"
template: "post"
draft: false
slug: "/books/cosmic-python/2023-05-06-pt02-ch09"
category: "books"
tags:
  - "ddd"
  - "books"
  - "backend"
  - "python"
description: "파이썬으로 살펴보는 아키텍처 패턴을 읽고 이해한 내용을 작성합니다. 챕터 9, 메시지 버스 톺아보기에 대한 내용입니다."
socialImage: { "publicURL": "./media/universe.jpg" }
---

이 내용은 "파이썬으로 살펴보는 아키텍처 패턴" 을 읽고 작성한 내용입니다. 블로그 게시글과, 작성한 코드를 함께 보시면 더욱 좋습니다.

9장은 해당 코드를 살펴봐주세요. [코드 링크](https://github.com/s3ich4n/cosmicpython-study/tree/main/pt2/ch09)

# 9장 메시지 버스 톺아보기

> 왜 제목이 이렇냐? Going to town (on sth)가 원래 [이런 뜻](https://dictionary.cambridge.org/dictionary/english/go-to-town-on)이더라고…
우리말에 좀 딱 맞아 보이는게 저 표현이긴 한데, 글쎄… 처음 쓸 때나 키치했지 지금은 영….
> 

이벤트를 보다 근본적인 요소로 사용해보자.

![기존 레이어를 가진 구조에서](https://www.cosmicpython.com/book/images/apwp_0901.png)

![메시지 버스가 메인이 되는 구조로 변경할 것이다!](https://www.cosmicpython.com/book/images/apwp_0902.png)

# 9.1 새 아키텍처가 필요한 새로운 요구사항

Rich Hickey란 사람은 오랫동안 실행되며 실세계의 처리 과정을 관리하는 **상황에 따른 소프트웨어**에 대해 이야기했다. 이런 예시로는 창고 관리 시스템, 물류 스케줄러, 급여 시스템 등이 있다.

이런 소프트웨어는 실세계에서의 예기치 못한 상황으로 인해 작성하기 어렵다. 예를들어 아래와 같은 케이스가 있을 것이다:

- 재고조사를 하는 동안 몇몇 제품이 손상되었음을 확인했다
- 몇몇 물품 배송 시 필요한 문서가 빠져서 몇 주간 세관에 머물러야 했다. 이후 안전검사에 실패하여 폐기처리 되었다
- 원재료의 공급 부족으로 인해 특정 배치에 대한 생산이 불가능하게 되었다

이러한 유형의 상황을 통해 시스템에 있는 배치 수량을 변경해야 한다는 사실을 배웠다. 이벤트 스토밍을 통해 이런 사항을 모델링하면 아래와 같은 그림이 나온다:

![배치 수량 변경 시 할당 해제 후 재할당을 해야하는 경우](https://www.cosmicpython.com/book/images/apwp_0903.png)

`BatchQuantityChanged` 라는 이벤트 발생 시 배치의 수량을 바꿔야 한다. 이와 함께 **비즈니스 규칙**을 적용해야 한다는 뜻이다. 변경 후 수량이 이미 할당된 수량보다 적어지면, 이런 주문을 배치에서 할당 해제(*deallocate*) 해야한다. 이후 각각 새로 할당해야한다. 이를 `AllocationRequired` 라는 이벤트로 표현한다.

이런 것을 구현할 때 내부 메시지 버스와 이벤트가 도움이 된다! 배치 수량을 조정하고 과도한 주문 라인을 할당 해제하는 `change_batch_quantity` 라는 서비스를 정의하고, 할당 해제가 일어날 때마다 `AllocationRequired` 이벤트를 발생시켜 기존 `allocate` 서비스에 별도의 트랜잭션으로 전달한다. 여기서도 메시지 버스를 사용하면 SRP를 강제할 수 있고, 트랜잭션과 데이터 통합에 관련된 선택을 할 수 있다.

## 9.1.1 구조 변경을 상상해보기: 모든 것이 이벤트 핸들러다

그렇다면 어떤 식으로 수정될지 다시 한 번 살펴보자. 시스템에는 두 가지 종류의 흐름이 있다:

1. 서비스 계층 함수에 의해 처리되는 API 콜
2. 이벤트
    1. 내부 이벤트: 서비스 계층 함수의 사이드 이펙트로 발생 가능
    2. 그 이벤트에 대한 핸들러: 서비스 계층 함수를 호출 가능

그렇다면, 모든 것이 이벤트 핸들러라면? API 호출을 이벤트 캐치용으로 생각하면, 서비스 게층함수도 이벤트라고 생각할 수 있다(!) 그러면 내부/외부 를 분리할 필요가 없다.

1. `services.allocate()` 는 `AllocationRequired` 이벤트의 핸들러이거나 `Allocate` 이벤트를 출력으로 내보낼 수도 있다.
2. `services.add_batch()` 도 `BatchCreated` 이벤트의 핸들러일 수도 있다[^1]

그리고 새로운 요구사항도 같은 패턴에 부합한다.

1. `BatchQuantityChanged` 이벤트는 `change_batch_quantity()` 핸들러를 호출할 수 있다
2. 새로운 `AllocationRequired` 이벤트가 `services.allocate()` 를 호출하게 할 수 있다. 따라서 API에서 새 할당요청이 들어오는 것과 내부에서 할당 해제에 의해 발생하는 재할당은 개념상 구분되지 않는다(!)

이 정도로 코드가 바뀌는건 매우 공격적이다! 그렇다면 점진적인 방법(*Preparatory Refactoring*)을 찾아보자[^2]. 이 방법은 “변경하기 쉽게 코드를 준비한다. 그 후 쉬워진 변경을 실제로 수행한다” 정도로 정리할 수 있다. 책에서는 아래와 같은 방안을 제시한다:

1. 서비스 계층을 이벤트 핸들러로 리팩토링. 이벤트가 시스템에 대한 입력을 설명하는 방식이라는 개념에 익숙해질 수 있음. `services.allocate()` 는 `AllocationRequired` 이벤트의 핸들러행
2. `BatchQuantityChanged` 이벤트를 시스템에 추가하고 `Allocated` 이벤트가 발생하는지 검사하는 e2e 테스트를 만들 것임
3. 구현은 아래와 같이…
    1. `BatchQuantityChanged` 에 대한 새로운 핸들러를 만듬
    2. 이 핸들러 구현은 `AllocationRequired` 이벤트를 발생
    3. API에서 사용하는 할당 핸들러와 같은 핸들러가 이 `AllocationRequired` 이벤트를 처리함

이 과정에서 메시지 버스와 UoW를 약간 변경해서 새 이벤트를 메시지 버스에 넣는 책임을 버스 자체로 옮길 것임

# 9.2 서비스 함수를 메시지 핸들러로 리팩토링하기

이벤트부터 정의하자!

```python
@dataclass
class BatchCreated(Event):
    ref: str
    sku: str
    qty: int
    eta: Optional[date] = None

@dataclass
class AllocationRequired(Event):
    orderid: str
    sku: str
    qty: int
```

그리고 `service.py` 를 `handler.py` 로 개명 후 기존 메시지 핸들러인 `send_out_of_stock_notification` 을 추가한다. 핵심은 모든 핸들러가 동일한 입력(UoW와 이벤트)를 갖도록 바꾸는 것이 핵심이다.

이러면서 서비스계층의 API를 더 구조화하고 일관성있게 다듬을 수 있다. 원래는 원시타입 값이 여기저기 흩어져 있었지만, 이젠 잘 정의된 객체를 사용한다.

## 도메인 객체에서 기본 타입에 대한 집착을 거쳐 인터페이스로 이벤트를 사용하기 까지

5.5절에서 서비스 계층 API가 도메인 객체에 대해 정의되었다가 갑자기 기본 타입을 썼던 것을 기억하고 있다. 근데 이젠 또 이벤트를 쓴다. 왤케 왔다갔다 하는 것이지?

OO 사이클에서 사람들은 기본 타입에 대한 집착(*primitive obsession*)을 안티패턴으로 간주한다. 공개 API에서 기본타입을 피하고 커스텀 값 클래스로 기본타입 값을 감싸기를 이야기한다.

파이썬 세계에서는 많은 사람들이 경험상 이에 대해 상당히 회의적이다. 무심코 적용하면 불필요한 복잡성을 초래할 수 있기 때문이다. 그래서 여기서 함수 파라미터를 도메인 객체서 기본 타입으로 바꿨다는 것 자체만으론 복잡도가 추가되는 건 아니다.

그런 관점에서 파라미터를 도메인 객체가 아니라 기본 타입으로 바꾸면 그 연결을 끊을 수 있다. 도메인에 엮이지도 않고, 모델을 바꿔도 서비스 계층은 API를 바꾸지 않고 예전과 같이 그대로 제공할 수 있다. 반대로 API가 바뀌더라도 모델은 그대로 남겨둘 수 있다.

그렇다면 이벤트를 도입하는건 맨 처음 염려대로 가는건가? 하지만 핵심 도메인 모델은 여전히 다른 계층과 관계없이 바뀔 수 있다. 이벤트 도입은 외부 세계와 이벤트 클래스를 연결할 뿐이다. 이벤트도 도메인의 일부일 뿐이지만 이벤트는 도메인에 대해 **훨씬 덜 자주 바뀔 것이다**라고 예측하면 어느정도 타당하다 할 수 있다.

이벤트를 도입하면 어떤 이득이 있는지 살펴보자:

- 애플리케이션의 유스케이스 호출 시 기본타입의 조합을 기억할 필요가 없다 → 애플리케이션 입력을 표현하는 단일 이벤트 클래스를 쓴다
- 입력값 검증에 써먹기 아주 좋은 장소다! 아래엔 본인 생각의 단상을 좀 써보겠다:
    - 그럼 pydantic으로 된걸 dataclass나 아니면 아예 attrs로 갈아타서 싹 갈아엎는게 나을려나?
    - sqlalchemy하고 긴밀하게 쓸 수 있는 게 뭔지부터 살펴보는게 좋을 것 같다. 그러면서 동시에 sqlalchemy 2.0 하고는 뭐가 어울리는지도 확실히 해두자

## 9.2.1 메시지 버스는 이제 이벤트를 UoW로부터 수집한다

이벤트 핸들러는 이제 UoW가 필요하다. 추가로 애플리케이션에서 메시지 버스는 더 중심 위치를 차지하게 되었다. 메시지 버스가 명시적으로 새 이벤트를 수집하고 처리하도록 하는 것이 더 타당하다. 현재는 UoW와 메시지 버스 사이의 순환적 의존성이 있는데, 이를 단방향으로 떼내자!

```python
async def handle(
        event: events.Event,
        uow: unit_of_work.AbstractUnitOfWork,           # 1)
):
    queue = deque(event)                                # 2)
    while queue:
        event = queue.pop(0)                            # 3)
        for handler in HANDLERS[type(event)]:           # 3)
            task = asyncio.create_task(handler(event))
            await task                                  # 4)
            queue.extend(uow.collect_new_events())      # 5)
```

1. 메시지 버스 시작 시 UoW를 받음
2. 첫 이벤트를 처리할 때 큐를 시작한다
3. `큐.pop()` 후 적절한 핸들러에 값을 던진다. `HANDLERS` 딕셔너리는 안바뀌었으니, 알아서 태스크 생성하고 돌 것이다
4. 메시지 버스는 UoW를 각 핸들러에 전달한다
5. 핸들러가 끝나면 이벤트 수집 후 이 이벤트를 큐에 추가한다. ([.extend()가 뭐냐](https://docs.python.org/3/tutorial/datastructures.html#more-on-lists)?)

> 맨 앞의 값 꺼내오는데 `[deque](https://docs.python.org/3/library/collections.html#deque-objects)`쓰면 O(1) 만에 나오지 않나? 싶기도 하고, thread-safe 하대서 `deque`로 바꿔써보기로 했다.
> 

그리고 `unit_of_work.py` 에 있는 `publish_events()` 를 `collect_new_events()` 로 바꾼다.

```python
async def collect_new_events(self):
    for product in self.products.seen:
        while product.events:
            yield product.events.popleft()   # 1)
```

1. 커밋이 일어나면 `publish_event` 를 호출하지 않고 이 메시지 버스는 이벤트 대기열을 추적한다
2. `deque`니까 popleft로 주면 됨!

## 9.2.2 모든 테스트는 이벤트 기반으로 다시 쓸 수 있다

예시를 살펴보자.

```python
class TestAddBatch:
    @pytest.mark.asyncio
    async def test_add_batch(self):
        uow = FakeUnitOfWork()

        await messagebus.handle(
            events.BatchCreated("b1", "CRUNCHY-ARMCHAIR", 100, eta=None),
            uow,
        )

        assert await uow.products.get("CRUNCHY-ARMCHAIR") is not None
        assert uow.committed

class TestAllocate:
    @pytest.mark.asyncio
    async def test_returns_allocation(self):
        uow = FakeUnitOfWork()
        await messagebus.handle(
            events.BatchCreated("batch1", "COMPLICATED-LAMP", 100, None),
            uow,
        )
        results = await messagebus.handle(
            events.AllocationRequired("o1", "COMPLICATED-LAMP", 10),
            uow,
        )

        assert results.popleft() == "batch1"
```

이런 식으로… 그런데 살펴볼 사항이 몇개 있다!

1. 테스트를 핸들로 단위별로 클래스로 감싼다
2. 서비스를 직접 부르는 것이 아니라, 메시지 버스에 이벤트를 전달하여 핸들러를 사용하도록 한다. 테스트 코드를 작성하며 이 스펙에 익숙해질 수 있다.

## 9.2.3 보기 싫은 임시 땜빵: 결과를 반환해야 하는 메시지 버스

```python
async def handle(
        event: events.Event,
        uow: unit_of_work.AbstractUnitOfWork,
):
    results = deque()
    queue = deque([event])
    while queue:
        event = queue.popleft()
        for handler in HANDLERS[type(event)]:
            task = asyncio.create_task(handler(event, uow=uow))
            results.append(await task)
            queue.extend(uow.collect_new_events())

    return results
```

이렇게 핸들에 결과가 나오는 이유는 읽기/쓰기 책임이 혼재되어서 그렇다. 12장에서 CQRS를 다루며 다시 살펴보자.

## 9.2.4 이벤트로 작동하도록 API 바꾸기

서비스를 직접호출하지 않고 이벤트를 인스턴스 후 메시지 버스에 전달하는 방법으로 고친다

```python
@app.post(
    "/allocate",
    status_code=status.HTTP_201_CREATED,
)
@inject
async def allocate_endpoint(
        order_line: OrderLineRequest,
):
    try:
        event = events.AllocationRequired(      # 1)
            orderid=order_line.orderid,
            sku=order_line.sku,
            qty=order_line.qty,
        )
        batchref = await messagebus.handle(     # 2)
            event, uow=unit_of_work.SqlAlchemyUnitOfWork(db.session_factory),
        )
        batchref = batchref.popleft()

    except (model.OutOfStock, handlers.InvalidSku) as e:
        raise HTTPException(
            detail=str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        ) from e

    else:
        return {'batchref': batchref}           # 3)
```

1. 이벤트를 인스턴스화 했다
2. 메시지 버스에 이벤트를 전달했다
3. 결과값을 리턴했다

여기까지 하면서 애플리케이션을 이벤트 기반으로 수정완료했다!

1. 서비스 계층 함수를 모두 이벤트 핸들러로 변경했다
2. 따라서 서비스 계층 함수 호출과 도메인 모델에서 발생한 내부 이벤트를 처리하기 위한 함수 호출이 동일해졌다
3. 이벤트는 시스템 입력을 잡아내는 데이터구조로 사용한다. 동시에 내부 작업 덩어리를 전달하기 위한 데이터 구조로도 사용한다
4. 이것으로 전체 앱은 메시지 처리기 혹은 이벤트 처리기가 되었다. 둘의 차이점은 10장에서 설명한다

# 9.3 새로운 요구사항 구현하기

리팩토링이 끝났으니, 코드가 ‘변경하기 쉽게’ 되었는지 살펴보자. 아래 그림에 맞는 요구사항을 구현해볼 것이다. `BatchQuantityChanged` 라는 신규 이벤트를 만든다. 이를 받아 핸들러에 넘기고, 이 핸들러는 다시 어떤 `AllocationRequired` 라는 이벤트를 발생시킨다. 이는 다시 기존 핸들러에 넘겨져서 재할당을 일으킬 수 있다.

![어 근데..??? 트랜잭션이 2개 아닌가…?](https://www.cosmicpython.com/book/images/apwp_0904.png)

> 사물을 두 단위의 UoW에 걸쳐 나누면 DB 트랜잭션이 두개 생긴다. 데이터 정합성 문제가 발생한다. 이는 첫 번째 트랜잭션은 끝났지만 두 번째 트랜잭션이 끝나지 않아서 생기는 문제다.

이런 사항에 대해 어떻게 처리할지는 14장에서 살펴본다.
> 

## 9.3.1 새로운 이벤트

배치 수량의 변경을 알려주는 이벤트는 단순하다. 추가해보자!

```python
@dataclass
class BatchQuantityChanged(Event):
    ref: str
    qty: int
```

# 9.4 새 핸들러 시범운영하기

4장에서 배운 교훈을 따르면, ‘high gear’ 를 사용해 일하면서 유닛 테스트를 가장 최상위 수준에서 짤 수 있다.

이 코드도 마찬가지로 클래스 단위로 감싸자.

```python
class TestChangeBatchQuantity:
    @pytest.mark.asyncio
    async def test_changes_available_quantity(self):
        uow = FakeUnitOfWork()

        await messagebus.handle(
            events.BatchCreated("batch1", "ADORABLE-SETTEE", 100, eta=None),
            uow,
        )

        [batch] = (await uow.products.get(sku="ADORABLE-SETTEE")).batches
        assert batch.available_quantity == 100

        await messagebus.handle(
            events.BatchQuantityChanged("batch1", 50),
            uow,
        )

        assert batch.available_quantity == 50       # 1)

    @pytest.mark.asyncio
    async def test_reallocates_if_necessary(self):
        uow = FakeUnitOfWork()
        event_history = [
            events.BatchCreated("batch1", "INDIFFERENT-TABLE", 50, None),
            events.BatchCreated("batch2", "INDIFFERENT-TABLE", 50, today),
            events.AllocationRequired("order1", "INDIFFERENT-TABLE", 20),
            events.AllocationRequired("order2", "INDIFFERENT-TABLE", 20),
        ]

        for e in event_history:
            await messagebus.handle(e, uow)

        [batch1, batch2] = (await uow.products.get(sku="INDIFFERENT-TABLE")).batches

        assert batch1.available_quantity == 10
        assert batch2.available_quantity == 50

        await messagebus.handle(events.BatchQuantityChanged("batch1", 25), uow)

        # order1 혹은 order2 가 할당 해제된다. 25-20이 수량이 된다.
        assert batch1.available_quantity == 5      # 2)
        # 다음 배치에서 20을 재할당한다
        assert batch2.available_quantity == 30     # 2)
```

1. 간단한 경우는 수량만 변경하면 된다
2. 할당된 수량보다 더 작게 수량을 바꾸면 최소 주문 한 개를 할당 해제하고 새로운 배치에 이 주문할당해야 하는 것을 예측한 코드다 → 요구사항이 그렇다면, 테스트코드를 그렇게 짜고 구현하면 된다는 것을 보여주는 것으로 보인다

## 9.4.1 구현

그럼 핸들러를 추가하고, 핸들러 관리 딕셔너리에도 추가해주면 될 것이다.

코드를 살펴보자:

```python
async def change_batch_quantity(
        event: events.BatchQuantityChanged,
        uow: unit_of_work.AbstractUnitOfWork,
):
    async with uow:
        product = await uow.products.get_by_batchref(batchref=event.ref)
        await product.change_batch_quantity(event.ref, event.qty)
        await uow.commit()
```

Repository에 새 쿼리타입이 필요하니, 추가해보자.

```python
class AbstractRepository(Protocol):                # 1)
    ...

    async def get_by_batchref(self, batchref) -> model.Product:
        raise NotImplementedError

class TrackingRepository:                          # 2)
    ...

    async def get_by_batchref(self, batchref) -> model.Product:
        product = await self._repo.get_by_batchref(batchref)
        if product:
            self.seen.add(product)
        return product

class SqlAlchemyRepository(AbstractRepository):    # 3)
    ...

    async def get_by_batchref(self, batchref) -> model.Product:
        return (
            (
                await self.session.execute(
                    select(model.Product)
                    .join(model.Batch)
                    .filter(orm.batches.c.reference == batchref)
                )
            )
            .scalars()
            .one_or_none()
        )
```

1. `Protocol` 로 구현했다보니 필요한 원형만 기재한다.
2. `TrackingRepository` 로 한 번 감싸서 리포지토리 쿼리와 이벤트 관련 내용을 처리한다.
3. `SqlAlchenyRepository` 에는 실제 쿼리내용을 추가한다.

테스트코드에서 쓰는 `FakeRepository` 도 마찬가지로 갈아준다.

```python
class FakeRepository(repository.AbstractRepository):
    ...

    async def get_by_batchref(self, batchref) -> model.Product:
        return next((
            p for p in self._products for b in p.batches
            if b.reference == batchref),
            None
        )
```

> 이 유스케이스를 쉽게 구현하기 위해 리포지토리에 쿼리를 추가했다.

쿼리가 단일 애그리게이트를 반환하면 문제없지만, 여러 저장소에 대해 복잡한 쿼리를 하면 다른 설계가 필요할 수 있다. 11장, 14장에서 그런 방안을 살펴볼 것이다.

예를 들면 이런 쿼리가 될 수 있을 것이다…
`get_most_popular_products` , `find_products_by_order_id` 같은 것들…
> 

## 9.4.2 도메인 모델의 새 메소드

모델에 새 메소드를 추가한다. 이 메소드는 수량을 바꾸자마자 인라인으로 할당을 해제하고 새 이벤트를 publish한다. 기존 `allocate` 함수를 수정하여 이벤트를 publish 하도록 바꾼다:

```python
class Product:
    ...

    def change_batch_quantity(self, batch_ref: str, qty: int):
        batch = self.get_allocation(batch_ref)
        batch.purchased_quantity = qty
        while batch.available_quantity < 0:
            line = batch.deallocate_one()
            self.events.append(
                events.AllocationRequired(
                    line.orderid,
                    line.sku,
                    line.qty,
                )
            )
```

새 핸들러를 이벤트와 연결함으로 마무리한다:

```python
HANDLERS = {
    events.BatchCreated: [handlers.add_batch],
    events.OutOfStock: [handlers.send_out_of_stock_notification],
    events.AllocationRequired: [handlers.allocate],
    events.DeallocationRequired: [handlers.deallocate],
    events.BatchQuantityChanged: [handlers.change_batch_quantity],   # 1)
}  # type: Dict[Type[events.Event], List[Callable]]
```

1. 추가완료!

# 9.5 선택: 가짜 메시지 버스와 독립적으로 이벤트 핸들러 단위 테스트 하기

reallocation 워크플로우 테스트는 e2e 테스트라 할 수 있다. 메시지 버스를 쓰고 전체 워크 플로우를 테스트한다. 이 테스트는 실제 메시지 버스를 사용하며, `BatchQuantityChanged` 이벤트 핸들러가 할당 해제를 트리거하고, 자체 핸들러가 처리하는 새로운 `AllocationRequired` 이벤트를 발생(*emit)*[^3]시키는 전체 플로우를 테스트한다.

이벤트 체인이 복잡해짐에 따라 독립적으로 일부 핸들러를 테스트하고 싶을 때가 온다. 이 때는 ‘가짜’ 메시지 버스를 사용하면 이런 테스트를 할 수 있다.

다름 예제에서 `FakeUnitOfWork` 의 `publish_events()` 메소드를 바꾸어서 실제 메시지 버스와 분리할 수 있다. 이 때는 메시지 버스에 넣는게 아니라 발생시킨 이벤트를 리스트(본 예제에서는 `deque`)에 저장한다.

상세한 내용은 `pt2/ch09`의 코드를 참고하면 된다.

# 9.6 마치며

시스템을 어떻게 바꿨는지 복습해보자.

## 9.6.1 시스템을 어떻게 바꾸었나?

이벤트는 시스템 안의 내부 메시지와 입력에 대한 데이터 구조를 정의하는 데이터 클래스다.

이벤트는 종종 비즈니스 언어로 매우 잘 번역되기 때문에 DDD 관점에서 보면 매우 강력하다(이벤트 스토밍을 꼭 복습하자!).

핸들러는 이벤트에 반응하는 방법이다. 핸들러는 모델을 호출하거나 외부 서비스를 호출할 수 있다. 원한다면 한 이벤트에 여러 핸들러를 정의할 수도 있다. 또 핸들러는 다른 이벤트를 만들 수도 있다. 이를 통해 핸들러가 수행하는 일의 크기를 세밀하게 조절하여 SRP를 유지할 수도 있다.

## 9.6.2 왜 이렇게 바꾸었나?

애플리케이션의 크기가 커지는 속도 보다 복잡도가 증가하는 속도를 느리게 하기 위함이다.

메시지 버스에 실으면 아키텍처는 복잡해지지만 필요 작업을 수행하기 위해 주요 개념 혹은 아키텍처 추가로 인한 코드 변경이 필요없다.

수량변경, 할당해제, 새 트랜잭션 시작, 재할당, 외부통지까지 한 번에 다 들어갔지만 아키텍처적으로 봤을 때는 복잡도가 늘어난 것은 아니다. 새 이벤트나 새 핸들러를 추가하고 외부 어댑터(메일전송)까지 추가하더라도 이벤트 기반의 아키텍처의 어디에 속하는지 파악할 수 있다.

전체 애플리케이션이 메시지 버스인 경우의 트레이드오프를 살펴보자!

| 장점 | 단점 |
| --- | --- |
| 핸들러와 서비스가 동일 물건이라서 더 단순하다 | 웹이라는 관점에서 메시지 버스를 보면 여전히 예측하기 어려운 처리방법이다
작업이 언제 끝나는지 예측할 수 없다 |
| 시스템 입력을 처리하기 좋은 데이터 구조가 있다 | 모델 객체와 이벤트 사이에 필드와 구조 중복이 있고, 이에 대한 유지보수가 필요하다. 한쪽에 필드를 추가한다면 다른쪽에 속한 객체에 두 개 이상 필드를 추가해야 한다. |

그리고 `BatchQuantityChanged` 같은 이벤트를 이해하기 위해, 이벤트와 커맨드의 차이부터 살펴볼 것이다.

10장에서 봅시다.

---

[^1]: 이런 이벤트 중 몇개는 커맨드같다? 맞다. 그런데 그건 12장에서 다시 살펴보는 걸로…

[^2]: [https://martinfowler.com/articles/preparatory-refactoring-example.html](https://martinfowler.com/articles/preparatory-refactoring-example.html)

[^3]: 왜 *emit* 이란 단어를 사용하는지는 해당 링크를 읽어보자. 다른 곳에서도 자주 쓰이는 듯 하니…
[https://stackoverflow.com/questions/31270657/what-does-emit-mean-in-general-computer-science-terms](https://stackoverflow.com/questions/31270657/what-does-emit-mean-in-general-computer-science-terms)
