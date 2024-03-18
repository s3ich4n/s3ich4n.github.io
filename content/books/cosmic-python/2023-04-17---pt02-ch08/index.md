---
title: "파이썬으로 살펴보는 아키텍처 패턴 (8)"
date: "2023-04-17T19:22:59.001Z"
template: "post"
draft: false
slug: "/devlog/docker/2023-04-17-cosmicpython-pt02-ch08"
category: "devlog"
tags:
  - "ddd"
  - "books"
  - "backend"
  - "python"
description: "파이썬으로 살펴보는 아키텍처 패턴을 읽고 이해한 내용을 작성합니다. 챕터 8, 애그리게이트와 일관성 경계에 대한 내용입니다."
socialImage: { "publicURL": "./media/universe.jpg" }
---

이 내용은 "파이썬으로 살펴보는 아키텍처 패턴" 을 읽고 작성한 내용입니다. 블로그 게시글과, 작성한 코드를 함께 보시면 더욱 좋습니다.

8장은 해당 코드를 살펴봐주세요. [코드 링크](https://github.com/s3ich4n/cosmicpython-study/tree/main/pt2/ch08)

# 8장 이벤트와 메시지 버스

걍 장고같은걸로 빠르게 서비스를 만들고 릴리즈할 수 있는 것 아니었나? 이게 진짜 이 정도로 가치있는 일인가?

실세계에서는 코드베이스를 더럽히는게 능사가 아니다. 코드베이스를 건드는건 기름때(원문에선 *goop*)와 같은 것이다. 

여기서는 “통지관련” 요구사항을 처리한다. 아래와 같은 요구사항을 말한다:

1. 플로우
    - (구매팀에게) 주문 할당이 부족합니다 라고 **통지**
    - 구매팀이 처리하면 이쪽에 다시 알람을 줄 것
2. 이메일 통지 만으로도 충분

평범한 요소에 뭔가 끼워넣어야 할 때, 아키텍처가 어떻게 유지되는지 살펴봅시다!

1. 간단하고 빠른 방법은? → 이러면 “진흙 공을” 어떻게 만드는지 (안티패턴!)
2. 도메인 이벤트(Domain event pattern)를 사용하면?
    1. 위의 부작용을 해결할 수 있나?
    2. 이벤트에 따른 동작을 메시지 버스 패턴으로 수행하는 방안?
3. 도메인 이벤트 사용방안
    1. 이벤트를 메시지 버스에 전달하는 방안
    2. 도메인 이벤트와 메시지 버스를 연결하기 위한 uow 변경방안

모두 합치면 대충 이런 그림이 될 거다.

![](./media/apwp_0801.png)

# 8.1. 지저분해지지 않게 막기

재고가 없으면 구매팀에게 메일로 통지한다. 같은 요구사항은 핵심 도메인하고는 관련이없다.

이런건 보통 웹 컨트롤러에 넣을 생각을 한다…

## 8.1.1 웹 컨트롤러가 지저분해지는 일을 막자

한 번만 변경할거면 이렇게 해도 되지만, 좋은 코드라고 하기는 힘들다.

이런 모양새가 나올 수도 있다는 뜻

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
        batchref = await services.allocate(
            orderid=order_line.orderid,
            sku=order_line.sku,
            qty=order_line.qty,
            uow=unit_of_work.SqlAlchemyUnitOfWork(db.session_factory),
        )

    except (model.OutOfStock, services.InvalidSku) as e:
        send_mail(
            'out of stock',
            'stock_admin@made.com',
            f'{line.orderid} - {line.sku}',
        )
        raise HTTPException(
            detail=str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        ) from e

    else:
        return {'batchref': batchref}
```

컨트롤러에 이것저것 넣으면 금방 전체가 더러워진다…

1. 메일 보내는걸 HTTP 계층이 하는 일은 아니다
2. 단위테스트도 하기 힘들다

## 8.1.2 모델이 지저분해지는 일을 막자

이러면 재고부족의 원인인 모델에 달아야되나?

```python
def allocate(
            self,
            line: OrderLine,
    ) -> str:
        try:
            batch = next(b for b in sorted(self.batches) if b.can_allocate(line))
            batch.allocate(line)
            self.version_number += 1
            return batch.reference
        except StopIteration:
            email.send_mail('stock_admin@made.com', f'out of stock for {line.sku}')
            raise OutOfStock(f"Out of stock for sku {line.sku}")
```

저자는 이게 더 구리다고 한다. 모델에 인프라구조에 의존하는 모양이기 때문이다. 도메인 모델은 단지 실제 할당할 수 있는 것 보다 더 많은 상품을 할당할 수는 없다’ 라는 규칙에만 집중해야하기 때문이다. 도메인과 연관없지만 이런 식으로 필요한 기능이 **아무데나** 붙는 것을 ‘코드의 기름때’와 같다고 말한다.

도메인 모델은 재고가 부족한지만 알면 되고, 통지를 보내는 것은 다른 곳에서 하도록 해야한다. 이런 기능은 켜고끌 수도 있어야 하고, 도메인 모델의 규칙을 바꾸지 않고서도 이메일, 문자 등으로 통지를 보낼 수도 있어야 한다.

## 8.1.3 …또는 서비스 계층이 지저분해지는 일을 막자

‘재고할당 시도 중 할당에 실패하면 메일을 보내야한다’ 는 워크플로우 오케스트레이션이다. 이 동작은 목표를 달성하기 위해 시스템을 따라야하는 단계다.

그럼 서비스계층에 넣나? 저자는 그것도 아니라고 한다.

```python
async def allocate(
        orderid: str,
        sku: str,
        qty: int,
        uow: unit_of_work.AbstractUnitOfWork,
) -> str:
    line = model.OrderLine(orderid, sku, qty)

    async with uow:
        product = await uow.products.get(sku=line.sku)
        if product is None:
            raise InvalidSku(f'Invalid sku {line.sku}')

        try:
            batchref = product.allocate(line)
            await uow.commit()
            return batchref
        except model.OutOfStock:
            email.send_mail('stock_admin@made.com', f'out of stock for {line.sku}')
            raise
```

예외를 잡아내고 또 발생하면 왠지 모르게 마음이 불편하다. 않이 왜이렇게 어려운거여

# 8.2 단일 책임 원칙

상기 내용들은 단일 책임 원칙(Single Responsibility Principle)에 위배된다[^1]. 여기서 처리하는 유스케이스는 할당이다. 엔드포인트인 서비스나 도메인이름은 `allocate` 이다. `allocate_and_send_mail_if_out_of_stock` 이 아니다.

> `then`, `and` 이란 단어를 **쓰지 않고** 함수가 하는 일을 설명할 수 없다면 SRP를 위반하고 있을 가능성이 높다
> 

SRP를 다른말로 하면 어떤 클래스를 수정해야 하는 이유가 단 하나만 존재해야한다 라고 설명할 수 있다. 따라서 이메일을 문자메시지로 변경할 때는 `allocate()` 를 바꿀 이유가 없다. 이메일을 문자메시지로 바꾸는데 `allocate()` 를 바꾼다는 말은 `allocate()` 가 상품할당 외에 다른 것도 한다는 뜻이다.

이러려면 오케스트레이션을 여러 단계로 구분해서 각각의 관심사가 서로 얽히는 일이 없도록 해야 한다[^2]. 도메인은 도메인의 일만하고 그 외의 일은 다른 존재에게 부여해야 한다.

세부구현으로부터 서비스계층을 분리한다. 서비스계층이 통지에 직접 의존하지 않고 추상화에 의존하도록 한다.

# 8.3 메시지 버스에 타라!

여기서 나오는 패턴은 “도메인 이벤트” 와 “메시지 버스” 다. 이는 구현방법이 여러가지다. 책의 구현 방식을 따라가기 전, 어떤 구현방식이 있는지 살펴보자

## 8.3.1 이벤트 기록 모델

모델은 이메일을 신경쓰지 않고 이벤트 기록을 담당한다. 이벤트는 발생한 일에 대한 사실을 뜻한다. 이벤트에 응답하지 않고 새 연산을 실행하기 위해 메시지 버스를 사용한다.

## 8.3.2 이벤트는 간단한 데이터 클래스다

이벤트는 VO에 속한다. 이벤트는 순수 데이터 구조이므로 동작이 없다. 이벤트를 항상 도메인 언어로 이름붙여야 한다. 항상 이벤트를 도메인 모델의 일부로 간주하여야 한다.

그런 고로 리팩토링을 수행한다.

`domain/model.py` , `domain/events.py` 로 분리시키자.

```python
from dataclasses import dataclass

class Event:  # 1)
    pass

@dataclass
class OutOfStock(Event):  # 2)
    sku: str
```

1. 이벤트 수가 늘어나면 공통 애트리뷰트를 담을 수 있는 부모 클래스가 유용하다. 타입힌팅도 적극도입할 수 있다.
2. `dataclasses` 는 이벤트의 경우에도 유용하다.

## 8.3.3 모델은 이벤트를 발생한다

도메인 모델은 발생한 사실을 기록하기 위해 이벤트를 발생시킨다.

외부에서 볼 땐 어떤식으로 보이는지 테스트코드를 짜서 스펙을 바꿔보자. `Product` 할당 요청 시 할당이 불가능하면 이벤트가 발생해야한다.

이런 식으로 원하는 기능을 테스트코드로 틀을 잡고…

```python
def test_records_out_of_stock_event_if_cannot_allocate():
    batch = Batch('batch1', 'SMALL-FORK', 10, eta=today)
    product = Product(sku='SMALL-FORK', batches=[batch])
    product.allocate(OrderLine('order1', 'SMALL-FORK', 10))

    allocation = product.allocate(OrderLine('order2', 'SMALL-FORK', 1))

    assert product.events[-1] == events.OutOfStock(sku="SMALL-FORK")
    assert allocation is None
```

이벤트를 담는 `events` 라는 리스트를 만들고, 여기에 append 하자. `OutOfStock` 예외는 사용하지 않는다.

```python
class Product:
    def __init__(
            self,
            sku: str,
            batches: List[Batch],
            version_number: int = 0,
    ):
        self.sku = sku
        self.batches = batches
        self.version_number = version_number
        self.events = []    # type: List[events.Event]

    def allocate(
            self,
            line: OrderLine,
    ) -> str:
        try:
            ...
        except StopIteration:
            self.events.append(events.OutOfStock(line.sku))
            # raise OutOfStock(f"Out of stock for sku {line.sku}")
```

> 흐름 제어를 위해 예외를 사용한 것을 빼기 위한 시도에 주목![^3]

그리고 도메인 이벤트를 구현하고 있다면 도메인에서 동일한 개념을 표현하기 위해 예외발생을 피하는 것이 좋다. 추후 작업단위패턴에서 이벤트 처리 시 이벤트와 예외 동시사용의 문제점을 볼 수 있게 된다. (추론이 빡세짐)
> 

## 8.3.4 메시지 버스는 이벤트를 핸들러에 매핑한다

메시지 버스는 “이 이벤트가 발생하면 다음 핸들러 함수를 호출하시오” 라고 말한다. 간단한 pub-sub 시스템이다. 핸들러는 수신된 이벤트를 subscribe 한다. 수신되는 이벤트는 버스에 시스템이 publish 한 것이다. 이 책에서는 딕셔너리로 메시지 버스를 구현한다.

```python
import asyncio

from allocation.adapters import email
from allocation.domain import events

async def handle(event: events.Event):
    for handler in HANDLERS[type(event)]:
        task = asyncio.create_task(handler(event))
        await task

async def send_out_of_stock_notification(event: events.OutOfStock):
    await email.send_mail(
        "stock@made.com",
        f"Out of stock for {event.sku}",
    )

HANDLERS = {
    events.OutOfStock: [send_out_of_stock_notification],
}  # type: Dict[Type[events.Event], List[Callable]]
```

> 동시성 개념은 아래 Repository들을 적극 참조하여 코드를 작성한 것이다.

1. 
2.
> 

> Celery와 메시지 버스는 비슷한가?

Celery는 그 자체로 완결적인 작업을 비동기 작업 큐에 넣고 처리하는 것이다.
책에서 말하는 메시지 버스는 아주 다르다.

작업을 메인 스레드 밖으로 빼야한다는 요구사항이 있더라도 여전히 이벤트 기반의 메타포를 쓸 수 있다. 이를 위해서는 외부 이벤트(*external event*)를 쓰는 것이 권장된다. 중앙 집중 스토어에 이벤트를 영속화하는 방법을 구현하면, 다른 컨테이너나 마이크로서비스가 이 중앙 집중 이벤트 스토어를 subscribe 할 수 있다.
그 후에는 한 프로세스나 서비스 내에서 작업 단위별로 책임을 분산하기 위해 이벤트를 사용한다는 개념을 그대로 여러 프로세스에 걸친 이벤트에 적용할 수 있다. 이 때 각 프로세스는 같은 서비스 내 다른 컨테이너이거나 완전히 다른 마이크로서비스일 수도 있다.

이런 접근방법에 따르면 작업을 분배하기 위한 API는 이벤트 클래스가 되거나 이벤트 클래스에 대한 JSON 표현이 될 수 있다. 이벤트 클래스나 JSON을 작업 분배용 API로 사용하면 작업을 위임할 대상을 폭넓게 고를 수 있다.
예를 들어 작업을 맡을 프로세스가 꼭 파이썬 서비스일 필요가 없다. 하지만 Celery 작업분배 API는 근본적으로 ‘함수 이름과 인수’ 로 이루어지며, 이는 좀 더 제한적이고 파이썬 안에서만 통하는 방식이다.
> 

# 8.4 첫 번째 선택지

서비스 계층이 모델에서 이벤트를 가져와 메시지 버스에 싣는 방안.

도메인 모델이 이벤트를 발생시키고 메시지 버스는 이벤트가 발생하면 적절한 핸들러를 호출한다. 이 둘을 연결해야한다. 모델에서 이벤트를 찾고 메시지 버스에 실어주는 publishing 단계를 실행할 것을 넣어야 한다.

첫 번째 방안은 서비스 계층에 코드를 약간 더 넣는 것이다.

```python
async def allocate(
        orderid: str,
        sku: str,
        qty: int,
        uow: unit_of_work.AbstractUnitOfWork,
) -> str:
    line = model.OrderLine(orderid, sku, qty)

    async with uow:
        product = await uow.products.get(sku=line.sku)
        if product is None:
            raise InvalidSku(f'Invalid sku {line.sku}')

        try:  # 1)
            batchref = product.allocate(line)
            await uow.commit()

            return batchref
        finally:  # 1)
            messagebus.handle(product.events)   # 2)
```

1. 몬생긴 try/finally 는 그대로고 `OutOfStock` **예외만** 뺐다.
2. 서비스 계층은 이메일 인프라에 직접 의존하지는 않고 모델에서 받은 이벤트를 직접 메시지 버스에 올리는 일만 담당한다.

이 정도만 해도 바람직하지 않은 부분을 상당히 없앨 수는 있다!

서비스 계층이 명시적으로 이벤트를 받아 통합한 다음 메시지 버스에 전달하는 여러 시스템을 가지게 된다.

# 8.5 두 번째 선택지

서비스 계층은 자신만의 이벤트를 발생한다

서비스 계층이 도메인 모델에서 발생한 이벤트를 처리하기보다 직접 이벤트를 만들고 발생시키는 일을 책임지는 방안도 있다.

```python
async def allocate(
        orderid: str,
        sku: str,
        qty: int,
        uow: unit_of_work.AbstractUnitOfWork,
) -> str:
    line = model.OrderLine(orderid, sku, qty)

    async with uow:
        product = await uow.products.get(sku=line.sku)
        if product is None:
            raise InvalidSku(f'Invalid sku {line.sku}')

        batchref = product.allocate(line)
        await uow.commit()  # 1)

        if batchref is None:
            messagebus.handle(events.OutOfStock(line.sku))

        return batchref
```

1. 할당에 실패해도 커밋은 한다. 이러면 코드가 더 단순해지고 코드 추론이 더 쉬워진다. '잘못되지 않으면 무조건 커밋된다' 라는 전제가 있으니 코드를 안전하고 깔끔하게 유지할 수 있다.

프로젝트의 여러 요소 간 상충관계에 따라 더 나은 방안도 있을 수 있다. 세 번째 선택지는 저자의 생각에 가장 우아한 해법이다.

# 8.6 세 번째 선택지

UoW가 메시지 버스에 이벤트를 publish

## 8.6.1 원래 전채 본문

UoW에는 이미 `try/finally` 구문이 있다. UoW는 저장소에 대한 접근을 제공하므로 어떤 애그리게이트가 작업을 수행하는지도 알고있다. 그러므로 UoW는 이벤트를 찾아서 메시지 버스에 전달하기 좋은 곳이다.

```python
class AbstractUnitOfWork(abc.ABC):
    ...

    async def commit(self):
        await self._commit()    # 1)
        await self.publish_events()   # 2)

    async def publish_events(self):
        for product in self.products.seen:   # 3)
            while product.events:
                event = product.events.pop(0)
                await messagebus.handle(event)

    @abc.abstractmethod
    async def _commit(self):    # 1)
        raise NotImplementedError

    @abc.abstractmethod
    async def rollback(self):
        raise NotImplementedError
```

1. 커밋 메소드를 바꾼다. 하위 클래스가 제공하는 비공개 `_commit()` 을 호출한다
2. 커밋 후 저장소에 전달된 모든 객체를 살펴보고 그 중 이벤트를 메시지 버스에 전달한다
3. 2의 기능은 저장소가 새 어트리뷰트인 `.seen` 을 통해 로딩된 모든 애그리게이트를 추적하는 것에 의존한다. 이를 아래에서 자세히 살펴보자.

> 핸들러 중 어느 하나가 실패하는 경우에 대한 예외처리는 10장에서 다시 보자.
> 

이어서 코드를 보자:

```python
class AbstractRepository(abc.ABC):
    def __init__(self):
        self.seen = set()   # type: Set[model.Product] (1)

    async def add(self, product: model.Product):   # (2)
        await self._add(product)
        self.seen.add(product)

    async def get(self, sku) -> model.Product:     # (3)
        product = await self._get(sku)
        if product:
            self.seen.add(product)
        return product

    @abc.abstractmethod
    async def _add(self, product: model.Product):  # (2)
        raise NotImplementedError

    @abc.abstractmethod
    async def _get(self, sku) -> model.Product:    # (3)
        raise NotImplementedError

class SqlAlchemyRepository(AbstractRepository):
    def __init__(self, session: AsyncSession):
        super().__init__()
        self.session = session

    async def _add(self, product: model.Product):  # (2)
        """ Batch 객체를 Persistent store에 저장한다.

        sqlalchemy의 add를 호출해서 그런가?

        """
        self.session.add(product)

    async def _get(self, sku: str) -> model.Product: # (3)
        return (
            (
                await self.session.execute(
                    select(model.Product)
                    .options(selectinload(model.Product.batches))
                    .filter(model.Product.sku == sku)
                )
            )
            .scalars()
            .one_or_none()
        )
```

1. UoW 가 새 이벤트를 publish하려면 저장소에 요청하여 이번 세션에 어떤 Product 객체를 쓴 것인지 알아야 한다. 여기서는 `.seen` 이라는 `Set`을 통해 사용한 Product 객체를 저장한다. 구현을 위해 `super().__init__` 을 호출해야한다는 뜻이다
2. 부모의 `add()` 메소드는 `.seen` 에 객체를 저장한다. 하위 클래스는 `_add()` 를 구현해야 한다
3. `get()` 도 마찬가지로 `_get()` 에 동작을 위임한다. 하위 클래스는 `_get()` 을 구현하여 자신이 살펴본 객체를 저장해야 한다.

> underscore(`_`)로 시작하는 메소드와 하위 클래스를 쓰는 것 말고도 여러 방안이 있다. 책에서 소개하는 두 방안은 아래와 같다

1. 별도 클래스를 빼서 Wrapper 클래스로 구현하기
2. [Protocol](https://peps.python.org/pep-0544/) 을 써서 *Composition over Inheritance* 를 구현하기[^4]
> 

3번 방안으로 구현하면 알아서 살아있는 객체를 추적하고, 그로부터 발생한 이벤트를 처리하도록 하면 서비스 계층은 이벤트 처리와 전혀 무관하게 된다.

그러면 서비스 계층을 테스트할 때 쓰던 가짜객체도 손봐줘야 할 것이다.

```python
class FakeRepository(repository.AbstractRepository):
    def __init__(
            self,
            products,
    ):
        super().__init__()
        self._products = set(products)

    async def _add(self, products):
        self._products.add(products)

    async def _get(self, sku):
        return next((b for b in self._products if b.sku == sku), None)

class FakeUnitOfWork(unit_of_work.AbstractUnitOfWork):
    def __init__(self):
        self.products = FakeRepository([])
        self.committed = False

    async def _commit(self):
        self.committed = True
```

… 이런 식으로 `super().__init__` 및 `_add()` 사용, `_get()` 사용, `_commit()` 사용 등.

### 8.6.2 연습문제

지금이야 코드도 짧고 예시에 가까운 것들이니 귀찮다 싶겠지만, 프로그램의 확장성을 공부한다는 차원에서 이 글도 보면 좋다. 

코드에는 `Protocol` 과 `TrackingRepository` 로 감싸는 두 접근법을 모두 취할 것이다.

객체지향 관점에서 좋은 접근방안에 대해 소개한 글이 있다. 

- [The Composition Over Inheritance Principle](https://python-patterns.guide/gang-of-four/composition-over-inheritance/)
- [Inheritance and Composition: A Python OOP Guide](https://realpython.com/inheritance-composition-python/)

그렇다면 composition over inheritance 구현 방안은 어떻게 짤 수 있을까?

이런 식으로 테스트용 UoW를 처리한다:

```python
class FakeUnitOfWork(unit_of_work.AbstractUnitOfWork):
    def __init__(self):
        self.products = repository.TrackingRepository(FakeRepository())
        self.committed = False

    def _commit(self):
        self.committed = True

    def _rollback(self):
        pass
```

이런 식으로 감싼다:

```python
class TrackingRepository:
    seen = Set[model.Product]

    def __init__(self, repo: AbstractRepository):
        self._repo = repo
        self.seen = set()  # type: Set[model.Product]

    def add(self, product: model.Product):
        self._repo.add(product)
        self.seen.add(product)

    def get(self, sku: model.Sku) -> model.Product:
        product = self._repo.get(sku)
        if product:
            self.seen.add(product)
        return product

    def list(self) -> List[model.Product]:
        return self._repo.list()
```

그 다음 사용할 때는 이런 식으로 처리한다. 테스트를 돌려보면서 점검해보자!

```python
class SqlAlchemyUnitOfWork(AbstractUnitOfWork):
    def __init__(self, session_factory):
        self.session_factory = session_factory

    async def __aenter__(self):
        self.session: AsyncSession = self._session_factory()
        self.products = repository.TrackingRepository(
            repository.SqlAlchemyRepository(self.session)
        )
        return await super().__enter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await super().__aexit__(exc_type, exc_val, exc_tb)
        await self.session.close()
```

# 8.7 마무리

## 8.7.1 본문

도메인 이벤트는 시스템에서 워크플로우를 다루는 또 다른 방안이다. X일 때 Y한다 라는 이벤트(아마 기억상 Policy 로 표현할 수 있는) 것을 코드로 풀어내는 방안이 이런 것이다 하는 것을 알게 되었다. 이벤트를 일급 시민인 요소로 다루면 코드를 보다 테스트하기 좋으면서도 관심사 분리에 도움되게 작성할 수 있다.

이벤트에 대한 장단점을 알아보자!

| 장점 | 단점 |
| --- | --- |
| 메시지 버스를 쓰면 어떤 요청에 대한 응답으로 여러 동작을 수행하는 경우에 대한 관심사 분리가 깔끔해진다 | UoW 내에서 알아서 처리되게 하는게 깔끔하긴 한데 명확하게 이해하기는 솔직히 어렵다. 비즈니스 로직에 따라서는 commit 의 명확한 시점 분리가 불분명하다 |
| 이벤트 핸들러는 ‘핵심’ 애플리케이션 로직과 완전히 분리될 수 있다. 추후 이벤트 핸들로 구현을 쉽게 변경할 수도 있다 | 감춰진 이벤트 처리 코드가 동기적으로 실행된다. 비동기 처리를 하면 그거대로 더 골아파진다. (본인이 참조해서 작성한 코드에서는 asyncio 의 태스크 gather로 풀던데…) |
| 실 세계를 모델링하기 아주 좋은 방법이다. 이를 비즈니스 언어의 일부분으로 쓸 수 있다 | 일반적으로는 이벤트 기반 워크플로우는 연속적으로 여러 핸들러로 분할된 후 시스템에서 요청을 어떻게 처리하는지 살펴볼 수 있는 단일지점이 없다. 이는 혼란을 야기할 수 있다. |
|  | 더 나아가 이벤트 핸들러가 서로를 의존해서 무한루프가 생기면…? |

애그리게이트 및 일관성 보장을 위한 bounded context가 필요함을 배웠다. 그렇다면 어떤 요청을 처리하기 위해 여러 애그리게이트를 변경해야 한다면 이벤트를 쓰면 될 것이다.

트랜잭션으로 서로 격리된 두 요소가 있다면, 이벤트를 통해 최종 일관성(*eventually consistent*)을 갖추도록 할 수 있다. 어떤 주문이 취소되면, 이 주문에 할당된 상품을 찾고 할당을 없애는 식으로…

## 8.7.2 도메인 이벤트와 메시지 버스 돌아보기

1. 이벤트는 단일 책임 원칙을 지키도록 돕는다
    1. 한 곳에 여러 관심사를 처리하는 것을 피하자!
    2. 이벤트를 사용해서 메인 유스케이스와 서브 유스케이스를 분리시키자
    3. 이벤트를 사용해 애그리게이트 끼리 통신하게 하자. 대해 잠기는 장기 실행 트랜잭션을 실행할 필요가 없도록 하자
2. 메시지 버스는 메시지를 핸들러에게 연결한다
    1. 메시지 버스를 이벤트와 이벤트 consumer를 연결하는 딕셔너리로 생각할 수 있다
    2. 메시지 버스는 이벤트의 의미를 전혀 모른다. 단순한 메시지 전달용 인프라일 뿐이다
3. 첫 번째 구현방안: 서비스 계층이 이벤트를 발생시키고 메시지 버스에 전달
    1. 작업 단위 커밋 후 `bus.handle(신규이벤트)` 호출하기
4. 두 번째 구현방안: 도메인 모델이 이벤트를 발생시키고, 서비스 계층이 메시지 버스에 이벤트를 전달
    1. 도메인 모델에서 이벤트 발생하게 하기
    2. 모델이 `commit` 후 핸들러가 이벤트를 찾아서 이벤트 버스에 싣도록 하기
5. 세 번째 구현방안: UoW가 애그리게이트에서 이벤트를 수집 후 메시지 버스에 전달
    1. `bus.handle(aggregate.events)` 를 모든 핸들러에 추가하는건 귀찮으므로, 메모리에 적재한 객체들이 발새시킨 이벤트를 UoW 가 발생하도록 시스템을 간결하게 풀기
    2. 하고나면 코드가 간단해짐. 다만 ORM에 의존적이긴 함

---

[^1]: SOLID 원칙의 `S`를 의미한다.

[^2]: 명령형에서 이벤트 기반 흐름 제어로 바꾸면 오케스트레이션이 안무로 바뀌게된다고 말한다.

[^3]: 아래 두 링크를 보고, 파이썬이든 뭐든 `try/catch` 구문을 극혐하고 빼야한다라고 생각하는 근거를 읽어보자.
[링크 1](https://softwareengineering.stackexchange.com/questions/189222/are-exceptions-as-control-flow-considered-a-serious-antipattern-if-so-why), [링크 2](https://stackoverflow.com/questions/855759/what-is-the-intended-use-of-the-optional-else-clause-of-the-try-statement-in)

[^4]: 아래 두 아티클이 굉장히 도움될 것이다
[링크 1](https://python-patterns.guide/gang-of-four/composition-over-inheritance/), [링크 2](https://realpython.com/inheritance-composition-python/)