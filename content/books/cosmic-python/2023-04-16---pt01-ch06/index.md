---
title: "파이썬으로 살펴보는 아키텍처 패턴 (6)"
date: "2023-04-16T19:09:45.000Z"
template: "post"
draft: false
slug: "/devlog/docker/2023-04-16-cosmicpython-pt01-ch06"
category: "devlog"
tags:
  - "ddd"
  - "books"
  - "backend"
  - "python"
description: "파이썬으로 살펴보는 아키텍처 패턴을 읽고 이해한 내용을 작성합니다. 챕터 6, 작업단위 패턴에 대한 내용입니다."
socialImage: { "publicURL": "./media/universe.jpg" }
---

이 내용은 "파이썬으로 살펴보는 아키텍처 패턴" 을 읽고 작성한 내용입니다. 블로그 게시글과, 작성한 코드를 함께 보시면 더욱 좋습니다.

6장은 해당 코드를 살펴봐주세요. [코드 링크](https://github.com/s3ich4n/cosmicpython-study/tree/main/pt1/ch06)

# 6장 Unit of Work(UoW) Pattern

작업 단위 패턴(UoW Pattern) 은 저장소와 서비스 계층 패턴을 하나로 묶어주는 것을 의미한다.

저장소 패턴이 영속적 저장소 개념에 대한 추상화라면 UoW 패턴은 원자적 연산(atomic operation) 개념에 대한 추상화를 의미한다. 이 패턴을 사용하면 서비스 계층과 데이터 계층의 분리가 가능하다.

이게…

![]([https://www.cosmicpython.com/book/images/apwp_0601.png](https://www.cosmicpython.com/book/images/apwp_0601.png))

이런 식의 UoW를 추가하여 DB의 상태를 관리하게 된다.

![]([https://www.cosmicpython.com/book/images/apwp_0602.png](https://www.cosmicpython.com/book/images/apwp_0602.png))

목표는 다음과 같다

- API는 두 가지 일만 함
    - 작업 단위 초기화
    - 서비스 호출
        - 서비스는 UoW와 협력(저자는 UoW도 계층처럼 생각하는 편)한다
        - 서비스 함수 자체나 API는 DB와 직접 대화하지 않는다
- 이 작업은 컨텍스트 매니저를 통해 수행한다(SQLAlchemy에서 이 철학을 쓴다)

# 6.1 작업 단위는 저장소와 협력

이 패턴을 적용한 코드는 대충 이런 모습이다:

```python
def allocate(
    orderid: str, sku: str, qty: int,
    uow: unit_of_work.AbstractUnitOfWork,
) -> str:
    line = OrderLine(orderid, sku, qty)
    with uow:  #(1)
        batches = uow.batches.list()  #(2)
        ...
        batchref = model.allocate(line, batches)
        uow.commit()  #(3)
```

1. `contextmanager` 로 UoW 시작
2. `uow.batches` 는 배치 저장소다. 즉 UoW는 영속적 저장소에 대한 접근을 제공한다.
3. 작업이 끝나면 커밋하거나 롤백한다
(흠… uow 컨텍스트 매니저 끝에 try-except-finally 등으로 명시하는건 어떨까?
→ 라고 생각했다면 6.6장을 보십시오)

UoW는 영속적 저장소에 대한 단일 진입점으로 작용한다. UoW는 어떤 객체가 메모리에 적재되었으며 어떤 객체가 최종 상태인지 기억한다[^1].

이 방식의 장점은 아래와 같다:

1. 작업에 사용할 DB의 안정적인 스냅샷을 제공하고, 연산을 진행하는 과정에서 변경하지 않은 객체에 대한 스냅샷도 제공한다
2. 변경 내용을 한번에 영속화할 방법을 제공한다. 어딘가 잘못되어도 일관성 없는 상태로 끝나지 않는다
3. 영속성을 처리하기 위한 간단한 API와 저장소를 쉽게 얻을 수 있는 장소를 제공한다

# 6.2 테스트-통합 테스트로 UoW 조정하기

UoW의 통합 테스트는 아래와 같다:

```python
def test_uow_can_retrieve_a_batch_and_allocate_to_it(session_factory):
    session = session_factory()
    insert_batch(session, 'batch1', 'HIPSTER-WORKBENCH', 100, None)
    session.commit()

    uow = unit_of_work.SqlAlchemyUnitOfWork(session_factory)    # (1)

    with uow:
        batch = uow.batches.get(reference='batch1')   # (2)
        line = model.OrderLine('o1', 'HIPSTER-WORKBENCH', 10)
        batch.allocate(line)
        uow.commit()

    batchref = get_allocated_batch_ref(session, 'o1', 'HIPSTER-WORKBENCH')
    assert batchref == 'batch1'
```

UoW는 “뭘 해야할지”를 테스트한다.

1. 커스텀 세션 팩토리로 세션을 받아온다
2. `uow.batches` 를 통해서 배치 저장소에 대해 접근한다
3. 작업이 끝나면 UoW에 대한 `commit()` 을 호출한다

`insert_batch` 나 `get_allocated_batch_ref` 는 헬퍼 함수다

# 6.3 작업 단위와 작업 단위의 `contextmanager`

테스트 코드에서는 UoW의 인터페이스가 뭘 해야될지 기재했다. 그렇다면 추상 클래스를 통해 인터페이스를 제공하자.

```python
import abc

from pt1.ch06.adapters import repository

class AbstractUnitOfWork(abc.ABC):
    batches: repository.AbstractRepository # (1)

    def __aexit__(self, exc_type, exc_val, exc_tb): # (2)
        self.rollback() # (4)

    @abc.abstractmethod
    async def commit(self): # (3)
        raise NotImplementedError

    @abc.abstractmethod
    async def rollback(self): # (4)
        raise NotImplementedError
```

1. 저장소에 접근할 수 있도록 설정한다.
2. 컨텍스트 매니저에 대한 매직 메소드. 이를 통해 `with` 구문을 쓸 수 있다.
    1. 추가로, `__aenter__` 나 `__aexit__` 은 비동기 처리를 위한 구문이다.
3. 커밋할 때가 되면 이 메소드로 커밋한다.
4. 문제가 생기면 예외를 발생시켜 컨텍스트 매니저를 빠져나가면 알아서 rollback 한다

## 6.3.1 SQLAlchemy 세션을 이용하는 실제 UoW

```python
class SqlAlchemyUnitOfWork(AbstractUnitOfWork):
    def __init__(self, session_factory):
        self._session_factory = session_factory # (1)

    async def __aenter__(self): # (2)
        self._session = self._session_factory()
        self.batches = repository.SqlAlchemyRepository(self.session)
        return await super().__aenter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await super().__aexit__(exc_type, exc_val, exc_tb)
        await self._session.close() # (3)

    async def commit(self): # (4)
        await self._session.commit()

    async def rollback(self): # (4)
        await self._session.rollback()
```

1. 세션 팩토리를 여기서 골라갈 수 있게 한다. 통합테스트에서는 오버라이드를 수행해서 SQLite를 쓰게 만들 것이다
2. `__aenter__` 는 DB세션 시작 및 저장소를 인스턴스화한다
3. 컨텍스트 관리자에서 나올 때 세션을 닫는다
4. 세션에 사용할 `commit()` 과 `rollback()`을 제공한다

## 6.3.2 테스트를 위한 가짜 UoW

```python
class FakeUnitOfWork(unit_of_work.AbstractUnitOfWork):
    def __init__(self):
        self.batches = FakeRepository([])  # (1)
        self.committed = False # (2)

    async def commit(self):
        self.committed = True # (2)

    async def rollback(self):
        pass

...

@pytest.mark.asyncio
async def test_add_batch():
    uow = FakeUnitOfWork() # (3)
    await services.add_batch("b1", "CRUNCHY-ARMCHAIR", 100, None, uow)

    assert await uow.batches.get("b1") is not None
    assert uow.committed

@pytest.mark.asyncio
async def test_returns_allocation():
    uow = FakeUnitOfWork() # (3)

    repo = FakeRepository.for_batch("b1", "COMPLICATED-LAMP", 100, eta=None)
    result = await services.allocate("o1", "COMPLICATED-LAMP", 10, uow)
    assert result == "b1"
```

1. 이 둘은 마치 결합된(coupled) 것 처럼 밀접하게 연관되어있다. 그렇지만 이 둘은 서로 협력자니까 크게 문제되지 않는다
2. 가짜 commit과 `FakeSession` 은 제 3자의 코드가 아니라 “내 코드” 를 가짜로 구현한 것이다. 이것은 큰 개선이다! ‘[당신이 만든 것이 아니면 모킹하지 마라](https://github.com/testdouble/contributing-tests/wiki/Don't-mock-what-you-don't-own)’ 하는 말에 부합하기 때문이다.
3. 테스트에서는 UoW를 인스턴스화 하고 서비스 계층에 저장소와 세션을 넘기는 대신 이거 하나로 퉁칠 수 있다. 훨씬 덜 번거롭다!

### 당신이 만든 것이 아니면 모킹하지 마라(**Don't mock what you don't own)**

세션보다 UoW를 모킹한게 편한 이유는 뭘까? 두가지 가짜(UoW, 세션)는 목적이 같다. 영속성 게층을 바꿔서 실제 DB를 안 쓰고 메모리 상에서 테스트할 수 있게 하는 것이다. 가짜 객체 두 개를 써서 얻을 수 있는 최종 설계에 차이가 있다.

예를들어 SQLAlchemy 대신 목 객체를 만들어서 Session을 코드 전반에 쓰면, DB 접근 코드가 코드베이스 여기저기에 흩어진다. 이런 상황을 피하기 위해 영속적 계층에 대한 접근을 제한해서 필요한 것”만” 가지게 한다.

코드를 Session 인터페이스와 결합하면 SQLAlchemy의 모든 복잡성과 결합하기로 하는 대신 더 간단한 추상화를 택하고 이를 통해 책임을 명확히 분리한다.

이 문단이 시사하는 바는 복잡한 하위 시스템 위에 간단한 추상화를 만들도록 해주는 기본 규칙이다. 간단한 추상화를 하면 성능상으로는 동일하나 내 설계가 맞는 방안인지 보다 신중하게 생각하도록 해준다. 

# 6.4 UoW 를 서비스계층에 써먹기

이런식으로 리팩토링이 된다.

```python
async def add_batch(
        ref: str,
        sku: str,
        qty: int,
        eta: Optional[date],
        uow: unit_of_work.AbstractUnitOfWork # (1)
):
    async with uow:
        await uow.batches.add(model.Batch(ref, sku, qty, eta))
        await uow.commit()

async def allocate(
        orderid: str,
        sku: str,
        qty: int,
        uow: unit_of_work.AbstractUnitOfWork  # (1)
) -> str:
    line = model.OrderLine(orderid, sku, qty)

    async with uow:
        batches = await uow.batches.list()
        if not is_valid_sku(line.sku, batches):
            raise InvalidSku(f'Invalid sku {line.sku}')

        batchref = model.allocate(line, batches)
        await uow.commit()

    return
```

1. 서비스 계층의 의존성은 UoW 추상화 하나 뿐이다

# 6.5 커밋/롤백에 대한 명시적 테스트

UoW를 구현해봤으니, 이러면 커밋/롤백을 테스트 하고싶어진다.

```python
@pytest.mark.asyncio
async def test_rolls_back_uncommitted_work_by_default(session_factory):
    uow = unit_of_work.SqlAlchemyUnitOfWork(session_factory)
    async with uow:
        insert_batch(uow._session, 'batch1', 'MEDIUM-PLINTH', 100, None)

    new_session = session_factory()
    rows = list(
        await new_session.execute(text('SELECT * FROM batches'))
    )
    assert rows == []

@pytest.mark.asyncio
async def test_rolls_back_on_error(session_factory):
    class MyException(Exception):
        pass

    uow = unit_of_work.SqlAlchemyUnitOfWork(session_factory)
    with pytest.raises(MyException):
        async with uow:
            insert_batch(uow._session, 'batch1', 'MEDIUM-PLINTH', 100, None)
            raise MyException()

    new_session = session_factory()
    rows = list(
        await new_session.execute(text('SELECT * FROM batches'))
    )
    assert rows == []
```

아래 내용을 테스트한다!

- 커밋 안 한 내용이 DB에 실제로 “없는지” 확인
- 롤백으로 인해 DB에 실제로 “없는지” 확인

> Tip
트랜잭션 같은 ‘불확실한’ DB동작을 ‘실제’ DB엔진에 대해 테스트할 가치가 있다.
Postgres같은 RDBMS로 바꾸고 나서 테스트하면 훨씬 편리할 것이다.
> 

# 6.6 명시적 커밋과 암시적 커밋

디폴트로 결과를 커밋하고 예외 발생 시에만 롤백하는 (처음 내 생각대로) 의 UoW는 `__aexit__` 에서 `exn_type` 이 `None` 일 때 커밋하는 것이다.

그런데 저자는 명시적 커밋이 낫다고 생각한다. 소프트웨어가 명령을 안 내리면 **************아무 것도 안 한다**************가 낫다라고 생각한다. 코드의 실행 상태를 추론하기도 보다 나아진다. 명시적이니까.

그리고 롤백하면 걍 마지막 지점으로 돌아가니까 중간 변화를 모두 포기한다. 로직 파악이 수월하다는 장점이 있다.

# 6.7 예제: UoW를 사용해 여러 연산을 원자적 단위로 묶기

UoW를 통한 코드 추론이 쉬워지는 것을 살펴보자!

## 6.7.1 예제 1: 재할당

```python
def reallocate(
        line: OrderLine,
        uow: AbstractUnitOfWork,
) -> str:
    with uow:
        batch = uow.batches.get(sku=line.sku)
        if batch is None:
            raise InvalidSku(f"invalid sku {line.sku}")
        batch.deallocate(line) # (1)
        allocate(line) # (2)
        uow.commit()
```

1. `deallocate()`이 실패하면 당연히 `allocate()`이 안 돌기를 바란다
2. `allocate()`이 실패하면 `deallocate()` 한 결과만 커밋하고 싶지는 않을 것이다

둘 다 제대로 작동하기를 바란다는 뜻

## 6.7.2 예제 2: 배치 수량 변경

운송 중 문제가 생겨 제대로 배송이 안 되었다는 상황을 코드로 풀어보자

```python
def change_batch_quantity(
        batchref: str,
        new_qty: int,
        uow: AbstractUnitOfWork,
):
    with uow:
        batch = uow.batches.get(reference=batchref)
        batch.change_purchased_quantity(new_qty)
        while batch.available_quantity < 0:
            line = batch.deallocate_one() # (1)
        uow.commit()
```

1. 원하는 만큼 할당 해제를 하려 하지만, 실패하면 그 어떤 사항도 적용되면 안 된다! 정합성을 유지해야한다!

# 6.8 통합 테스트 정리하기

`integration` 디렉토리 안을 보면 테스트 관련 코드가 3개 있다.

- `test_orm.py`
    - SQLAlchemy 를 내 로직에 맞게 풀어낸 것을 테스트한다
- `test_repository.py`
    - 주요 리포지토리 로직을 테스트한다
- `test_uow.py`
    - 추상화 레벨을 올리면 좋을듯?

# 6.9 마치며

UoW의 유용성과 `contextmanager` 를 통한 pythonic code 생성을 맛보았다.

근데 이미 사실 SQLAlchemy 내부적으로 Session 객체가 UoW대로 구현되어있다. SQLAlchemy의 세션객체는 DB에서 새 엔티티를 읽을 때마다 엔티티의 변화를 추적하고, 세션 `flush` 를 수행할 때 모든 내용을 한꺼번에 영속화한다.

근데 쓰는 이유가 있겠지? 여기까지의 트레이드오프를 살펴보자:

| 장점 | 단점 |
| --- | --- |
| 원자적 연산을 표현하는 좋은 추상화 레벨을 가진다. contextmanager 를 사용해서 atomic하게 한 그룹으로 묶어야 하는 코드 블록을 시각적으로 쉽게 알아볼 수 있다. | ORM은 이미 원자성을 중심으로 좋은 추상화를 제공할 수도 있다. SQLAlchemy에는 이미 contextmanager를 제공한다. 세션을 주고받는 것 만으로도 많은 기능을 꽁으로 먹을 수 있다 |
| 트랜잭션 시작-끝 을 명시적으로 제어할 수 있고, 앱이 실패하면 롤백한다. 연산이 부분적으로 커밋되는 걱정을 덜어낼 수 있다 | 롤백, 다중스레딩, nested transactions등의 코드를 짤 때는 보다 더 신중하게 접근해야 한다. |
| 원자성은 트랜잭션 뿐 아니라 이벤트, 메시지 버스를 사용할 때도 도움이 된다. |  |

SQLAlchemy의 Session API는 풍부한 기능과 도메인에서 불필요한 연산을 제공한다. UoW는 세션을 단순화해 핵심부분만 쓸 수 있게 해준다. UoW를 시작하고, 커밋하거나 작업결과를 갖다버릴 수도 있다(*thrown away*).

UoW를 써서 Repository 객체에 접근하는건 그냥 SQLAlchemy Session 만 써선 쓸 수 없는 장점을 가진다.

## UoW 정리

1. UoW 패턴은 데이터 무결성 중심 추상화다
    1. 연산 끝에 commit (이후 flush) 를 통해 도메인 모델의 일관성을 강화하고 성능향상(?)에 도움이 된다
2. 저장소, 서비스 계층 패턴과 밀접하게 연관되어 작동한다
    1. UoW는 원자적 업데이를 표현해 데이터 접근에 대한 추상화를 완성시켜준다. 서비스 계층의 유스케이스들은 블록단위로 성공하거나 실패하는 별도의 작업단위로 실행된다
3. contextmanager를 쓰는 유스케이스
    1. rollback을 파이썬스럽게 풀어냈다는 점에서 이미 매우 훌륭하다
4. SQLAlchemy는 이미 UoW 패턴을 제공한다
    1. SQLAlchemy의 Session 객체를 더 간단히 추상화해서 필요한 기능”만” 쓸 수 있게 노출시킨다.
5. UoW 도 추상화로 또 감싸서 의존성 역전 원칙을 활용한다

[^1]: 어떤 목표를 달성하기 위해 서로 협력하는 객체를 묘사하는 협력자(collaborator) 라는 단어가 있다. UoW와 Repository는 객체 모델링의 측면에서 아주 적절한 협력자의 예시라 할 수 있다. 책임 주도 설계에서 자신의 역할 안에서 협력하는 여러 객체를 이웃 객체(object neighborhood)라고 한다.
