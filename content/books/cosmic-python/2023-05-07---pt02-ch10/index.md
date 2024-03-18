---
title: "파이썬으로 살펴보는 아키텍처 패턴 (10)"
date: "2023-05-07T18:41:36.000Z"
template: "post"
draft: false
slug: "/devlog/docker/2023-05-07-cosmicpython-pt02-ch10"
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

10장은 해당 코드를 살펴봐주세요. [코드 링크](https://github.com/s3ich4n/cosmicpython-study/tree/main/pt2/ch10)

# 10장 커맨드와 커맨드 핸들러

이전 장에서는 시스템 입력을 표현하기 위해 이벤트를 사용하는 방법을 익혔고, 애플리케이션을 메시지 처리 기계로 바꿨다.

이를 위해 모든 유스케이스 함수를 이벤트 핸들러로 바꿨다. API는 새 배치 생성 호출을 받으면 `BatchCreated` 이벤트를 만들어서 내부 이벤트처럼 처리한다. 그런데 배치가 생성되지도 않았는데 API를 호출한다? 뭔가 이상하다(라고 하네요?)

이벤트와 같은 메시지 버스를 다루지만 약간 다른 규칙으로 처리하는 커맨드를 도입하여 이런 사항을 수정한다.

# 10.1 커맨드와 이벤트

이벤트와 마찬가지로 커맨드(*command*)도 메시지의 일종이다. 시스템의 한 부분에서 다른 부분으로 전달되는 명령이 커맨드다. 커맨드도 아무 메소드 없는 데이터 구조로 표현하고 이벤트처럼 처리하는데 **그 둘의 차이가 정말 중요하다!**

커맨드는 한 액터[^1]로부터 다른 구체적인 액터에게 전달된다. 보내는 액터는 받는 액터가 커맨드를 받고 작업을 해주기를 바란다. API 핸들러에 폼을 전달하는 행동은 커맨드를 전달하는 행동과 같다. 그래서 커맨드 이름은 명령형 동사구(*imperative mood verb*)다. 예를 들면 아래와 같다:

- Allocate stock
- Delay shipment

커맨드는 의도(*intent*)를 잡아낸다. 커맨드는 시스템이 어떤 일을 수행하길 바라는 의도를 드러낸다. 그 결과로 커맨드를 보내는 액터는 커맨드 리시버(*reciever*)가 커맨드 처리에 실패했을 때 오류를 돌려받길 바란다.

이벤트(*event*)는 액터가 관심있는 모든 리스너에게 보내는 메시지다. `BatchQuantityChanged` 라는 이벤트를 publish 해도 보내는 쪽(*sender*)은 누가 이걸 받는지 모른다. 아래 표는 커맨드와 이벤트의 차이다.

|  | 이벤트 | 커맨드 |
| --- | --- | --- |
| 이름 | 과거형 | 명령형 |
| 오류 처리 | (송신하는 쪽과) 독립적으로 실패함 | (송신하는 쪽에 오류를 돌려주며) 시끄럽게 실패함 |
| 누구에게
보내나? | 모든 리스너 | 정해진 수신자 |

현재 어떤 커맨드가 있는지 살펴보자.

```python
from dataclasses import dataclass

class Command:
    pass

@dataclass
class Allocate(Command):               # 1)
    order_id: str
    sku: str
    qty: int

@dataclass
class CreateBatch(Command):            # 2)
    ref: str
    sku: str
    qty: int
    eta: str

@dataclass
class ChangeBatchQuantity(Command):    # 3)
    ref: str
    qty: int
```

1. `AllocationRequired` 이벤트를 대신한다
2. `BatchCreated` 이벤트를 대신한다
3. `BatchQuantityChanged` 이벤트를 대신한다

# 10.2 예외 처리 방식의 차이점

이름, 동사를 바꾸는건 뭐 IDE한테 맡기면 그만이지만 로직을 어떻게 바꿔야하는지(메시지 버스 변경 등)을 살펴보자

커맨드, 이벤트를 통으로 처리하는 값을 메시지(`Message`)라 정의하고 이를 `Union` 으로 처리하자!

```python
Message = Union[commands.Command, events.Event]                           # 1)

async def handle(
        message: Message,                                                 # 1)
        uow: unit_of_work.AbstractUnitOfWork,
):
    results = deque()
    queue: deque[Message] = deque([message])
    while queue:
        message = queue.popleft()

        if isinstance(message, events.Event):
            await handle_event(message, queue, uow)                       # 2)
        elif isinstance(message, commands.Command):
            result = await handle_command(message, queue, uow)            # 3)
            results.append(result)
        else:
            raise Exception(f'{message} was not a Command or Event')

    return results
```

1. 메시지라는 값을 만들고, 커맨드/이벤트에 대해 받을 수 있게 해놨다
2. 이벤트 핸들러에 대해 별도로 분리했다. 진입점도 분리되어있다.
3. 커맨드 핸들러에 대해 별도로 분리했다. 진입점도 분리되어있다.

이벤트 처리 방안은 아래와 같다:

```python
async def handle_event(
        event: events.Event,
        queue: deque[Message],
        uow: unit_of_work.AbstractUnitOfWork,
):
    for handler in MessageBus.EVENT_HANDLERS[type(event)]:  # 1)
        try:
            logger.debug(f'Handling event {event} with {handler}')
            await handler(event, uow)
            queue.extend(uow.collect_new_events())
        except Exception as ex:
            logger.exception(f'Exception handling {event}... detail: {ex}')
            continue                                        # 2)
```

1. 한 이벤트를 여러 핸들러가 처리하도록 위임할 수 있는 디스패처로 이벤트가 처리된다
2. 오류가 생각하면 로그를 남기지만, 오류가 메시지 처리를 방해하지는 못하게 한다

커맨드 처리 방안은 아래와 같다:

```python
async def handle_command(
        command: commands.Command,
        queue: deque[Message],
        uow: unit_of_work.AbstractUnitOfWork,
):
    logger.debug(f'Handling command {command}')
    try:
        handler = MessageBus.COMMAND_HANDLERS[type(command)]   # 1)
        result = await handler(command, uow)
        queue.extend(uow.collect_new_events())
        return result                                          # 3)
    except Exception as ex:
        logger.exception(f'Exception handling {command}... detail: {ex}')
        raise                                                  # 2)
```

1. 커맨드 디스패처는 커맨드 하나에 핸들러 하나만을 허용한다(헷갈린다면 10.1 에서 내린 정의를 살펴보자!)
2. 오류가 발생하면 propagate 한다
3. `return result` 구문은 임시방편이다(!) 9.2.3절에서 언급한 내용이다. 이 방법은 API가 사용하기 위한 배치 참조를 돌려주기 위한 값이다. 12장에서 수정할 것이다.

메시지 버스를 살펴보자. 두 딕셔너리로 분리한 클래스로 관리한다[^2]. 앞서 살펴보았듯 각 이벤트에는 여러 핸들러가 있을 수 있다. 하지만 각 커맨드에는 핸들러가 하나밖에 없다.

```python
class MessageBus:
    EVENT_HANDLERS = {                                                 # 1)
        events.OutOfStock: [handlers.send_out_of_stock_notification],
    }   # type: Dict[Type[events.Event], List[Callable]]
    COMMAND_HANDLERS = {                                               # 2)
        commands.Allocate: handlers.allocate,
        commands.Deallocate: handlers.deallocate,
        commands.CreateBatch: handlers.add_batch,
        commands.ChangeBatchQuantity: handlers.change_batch_quantity,
    }   # type: Dict[Type[commands.Command], Callable]
```

1. 이벤트 핸들러의 특징을 살펴보자
2. 커맨드 핸들러의 특징도 마찬가지다

# 10.3 논의: 이벤트, 커맨드, 오류 처리

저자는 여기까지 왔을 때의 불편함이나 개선사항을 아래와 같이 말한다.

- 만약 이벤트 처리에 실패하면 어떻게 처리할 것인가?
- 시스템이 일관성있는 상태를 유지한다고 어떻게 확신할 수 있나?
- 현 구조에서는 메시지 유실이 염려된다. 만일 `MessageBus.handle` 에서 이벤트를 절반만 처리하다가 OOM으로 프로세스가 죽으면 메시지가 사라질것이다. 이 경우는 어떻게 해결해야 할까?

최악의 경우를 생각해보자. 이벤트 처리에 실패하고 시스템이 일관성을 잃었다. 이로 인해 어떤 오류가 생겼나 살펴보자. 연산 중 일부만 완료된 경우 시스템이 일관성 없는 상태가 될 수 있다.

요컨대 `DESIRABLE_BEANBAG` [^3] 3개를 고객 주문에 할당했지만, 왠진 모르겠으나 현재 재고 감소에 실패했다고 치자. 겉보기엔 재고 세 개가 모두 할당되고 사용 가능한 상태가 되어버린다. 이러면 일관성이 무너진 것이다. 재고 파악을 옳게 못하다가 다른 고객에게 oversell 해버리면?

다행히도 `Allocate` 서비스에서는 조치를 취해놨다. 애그리게이트를 일관성 경계로 동작하게 해놨고, 애그리게이트에 대한 업데이트 성공/실패를 atomic하게 처리하기 위해 UoW를 설계했다.

예를 들자면, 주문에 재고를 할당할 때의 consistency boundary는 `Product` 애그리게이트다. 여기서 과할당을 방지할 수 있다. 특정 주문 라인이 제품에 할당하거나, 그렇지 않으면 아예 할당하지 않는다[^4].

그리고 프로젝트 정의에 따르면, 두 애그리게이트는 즉각적으로 일관성을 가질 필요가 없다. 어떤 이벤트를 처리하다 실패해서 애그리게이트 하나만 업데이트 된다고 해도, 시스템은 일관성을 갖춘다. 시스템의 제약 조건을 위반하면 안 된다.

이런 예제를 통해 메시지를 커맨드와 이벤트로 분리하는 이유에 대해 다시금 생각할 수 있게 되었다. 사용자가 시스템이 어떤 일을 하길 원한다면 이 요청을 **커맨드**로 표현한다. 커맨드는 한 **애그리게이트**를 변경해야 하고, 전체적으로 성공하거나 모두 실패해야한다. 시스템이 수행하는 다른 재고처리나 후속조치는 **이벤트**로 발생시킨다. 커맨드가 성공하기 위해 이벤트 핸들러가 성공할 필요는 없다.

커맨드가 성공하기 위해 이벤트가 성공하지 않아도 되는 이유를 아래의 다른 예시로 살펴보자.

## 10.3.1 예제: 명품을 파는 전자상거래 사이트 설계

어느 사이트에서 많이 팔아주시는 VIP 고객님을 선정하는 기준을 아래와 같이 정리하고 처리하기로 했다 치자.

1. 주문 이력이 2개있는
2. 고객이 3번째 주문을 할 때
3. 이 고객을 VIP로 선정한다
4. 처음 VIP로 변경된 고객에게는
5. 축하 메일을 보낸다

이걸 애그리게이트 단위로 풀어내면 된다는 뜻이다. 이 애그리게이트를 `History` 라고 하고 예시를 살펴보자. 이 애그리게이트는 주문을 기록하고, 규칙을 만족할 때 도메인 이벤트를 발생시킨다.

```python
class History:
    def __init__(
            self,
            customer_id: int,
    ) -> None:
        self.orders: Set[HistoryEntry] = set()
        self.customer_id = customer_id

    def record_order(
            self,
            order_id: str,
            order_amount: int,
    ):   # 1)
        entry = HistoryEntry(order_id, order_amount)

        if entry in self.orders:
            return

        self.orders.add(entry)

        if len(self.orders) == 3:
            self.events.append(
                CustomerBecameVIP(self.customer_id)
            )
    
def create_order_from_basket(
        uow,
        cmd: CreateOrder,
):    # 2)
    with uow:
        order = Order.from_basket(cmd.customer_id, cmd.basket_items)
        uow.orders.add(order)
        uow.commit()  # raises OrderCreated

def update_customer_history(
        uow,
        event: OrderCreated,
):    # 3)
    with uow:
        history = uow.order_history.get(event.customer_id)
        history.record_order(event.order_id, event.order_amount)
        uow.commit()  # raises CustomerBecameVIP

def congratulate_vip_customer(
        uow,
        event: CustomerBecameVIP,
):    # 4)
    with uow:
        customer = uow.customers.get(event.customer_id)
        email.send(
            customer.email_address,
            f'Congratulations {customer.first_name}!'
        )
```

1. `History` 애그리게이트는 고객이 VIP가 되는 규칙을 체크한다. 애그리게이트는 이런 식으로 규칙을 처리하는 좋은 장소임을 캐치하자
2. 첫 핸들러는 고객 주문을 생성하고 `OrderCreated` 라는 도메인 이벤트를 발생시킨다
3. 두 번째 핸들러는 만들어진 주문을 기록하기 위해 `History` 를 업데이트한다
4. 고객에게 VIP가 되었음을 알리는 메일을 전송한다

가만보면 이벤트 기반 시스템에서는 오류를 어떻게 처리하는지 볼 수 있다.

- 애그리게이트는 상태를 DB에 **영속화한 이후** 이벤트를 발생시킨다
- **영속화 이전**에 이벤트 발생 및 변화를 커밋하는건? 그 후에 “동시에” 모든 변화를 커밋하면? 이러면 모든 작업이 완료됐다 할 수 있을텐데 이게 더 낫지 않나?

하지만 만일 메일 서버가 과부화라면? 모든 작업이 동시에 끝나야되면 '메일 전송’ 작업이 다른 작업의 발목이 될 수도 있다.

`History` 애그리게이트에 버그가 있다면? 고객을 VIP로 인식하지 못했다고 해서 고객의 결제처리를 하면 안되는건가?

이런 관심사를 분리하면 실패할 수 있는 요소들이 서로 격리되어 실패하게 할 수 있다. 이 코드에서 성공해야 하는 부분은 주문 생성 커맨드 핸들러 뿐이다. 이 것만이 고객이 신경쓰는 부분이고, 비즈니스 관계자들이 중요하게 생각하는 부분이다.

트랜잭션 경계를 비즈니스 프로세스 시작과 종료에 맞추어 의도적으로 조정한 것인지 살펴보자. 코드에서 쓰는 이름은 비즈니스 관계자들이 쓰는 언어와 일치하며, 핸들러는 자연어로 작성한 판별 기준과 일치한다. 이름과 구조가 일치하면 시스템이 커지고 복잡해질 때, 시스템을 추론하는 과정에서 상당히 도움된다.

# 10.4 동기적으로 오류 복구하기

위에서 살펴본 바와 같이, 이벤트는 이벤트를 발생시킨 커맨드와 독립적으로 실패해도 좋다. 불필요하게 오류가 발생한 경우 오류를 복구시킬 수 있다고 확신하려면 어떻게 해야할까?

가장 먼저 해야할 것은 오류가 언제 일어났는지를 파악하는 것이다. 그것 때문에 오류 발생시점의 로그를 찍는 것이었다. `handle_event()` 로직을 다시 살펴보자.

```python
async def handle_event(
        event: events.Event,
        queue: deque[Message],
        uow: unit_of_work.AbstractUnitOfWork,
):
    for handler in MessageBus.EVENT_HANDLERS[type(event)]:
        try:
            logger.debug(f'Handling event {event} with {handler}')
            await handler(event, uow)
            queue.extend(uow.collect_new_events())
        except Exception as ex:
            logger.exception(f'Exception handling {event}... detail: {ex}')
            continue
```

시스템에서 메시지 처리할 때 처음 하는 일은 로그를 찍는 것이다. 위의 `History` 예시를 통해서 다시 참고해보자. `CustomerBecameVIP` 라는 유스케이스의 경우 로그는 아래와 같다:

```
Handling event CustomerBecameVIP(customer_id=12345) with handler <function congratulate_vip_customer at 0x10ebc9a60>
```

`dataclasses` 를 써서 저런 식으로 데이터를 요약해서 볼 수 있다. 객체를 다시 만들기 위해 이 출력을 복사해 파이썬 shell에 복붙도 할 수 있다.

오류가 발생하면 로그에 저장된 데이터를 사용해 문제를 유닛테스트로 재현하거나 시스템에서 메시지를 다시 실행할 수 있다.

이벤트를 다시 처리하기 전에 버그를 수정해야 한다면 수동 재실행이 잘 작동한다. 하지만 시스템은 어쨌거나 백그라운드에서 **일시적인 실패가 일정 수준은 항상 존재**할 것이다. 이런 실패에는 네트워크의 일시적 문제, DB의 데드락, 배치로 인해 발생하는 일시적 서비스 중단 등이 그것이다.

이런 경우에는 재시도를 하여 깔끔하게 복구할 수 있다. '깔끔하게' 라는 뜻은 '한 번 만에 안 되면 기하급수적으로 증가하는 백오프 기간(*exponentially increasing back-off period*) 후에 재시도 한다'를 의미한다.

동기적으로 재시도하는 코드의 예시를 보자:

```python
from tenacity import (
    Retrying,
    RetryError,
    stop_after_attempt,
    wait_exponential,
) #(1)

def handle_event(
    event: events.Event,
    queue: List[Message],
    uow: unit_of_work.AbstractUnitOfWork,
):
    for handler in EVENT_HANDLERS[type(event)]:
        try:
            for attempt in Retrying(  #(2)
                stop=stop_after_attempt(3),
                wait=wait_exponential()
            ):

                with attempt:
                    logger.debug("handling event %s with handler %s", event, handler)
                    handler(event, uow=uow)
                    queue.extend(uow.collect_new_events())
        except RetryError as retry_failure:
            logger.error(
                "Failed to handle event %s times, giving up!",
                retry_failure.last_attempt.attempt_number
            )
            continue
```

1. [Tenacity](https://github.com/jd/tenacity)는 파이썬에서 재시도와 관련한 패턴을 구현한 라이브러리다
2. 여기서는 메시지버스가 `3`번을 기하급수적으로 증가하는 백오프 기간을 두고 재시도한다

실패할 수도 있는 연산을 재시도하는 것은 시스템의 회복 탄력성(*resilience*)을 향상시키는 최선의 방안일 것이다. 최소한 이렇게라도 해야 작업이 반쯤 끝난 상태로 남지 않게 한다.

> ‼️ **CAUTION** ‼️

`tenacity` 를 쓰는 것과 별개로, 어느 시점에서는 메시지를 처리하려는 시도를 *포기* 해야한다.
분산 메시지를 사용해서 *반드시* 신뢰할 수 있는 시스템을 만드는 것은 매우 힘든 일이다. 그 부분은 에필로그에서 다시 볼 것이다
> 

여기서는 `tenacity`를 사용한 비동기 코드의 작업방안에 대해 살펴본다:

```python

```

# 10.5 마치며

커맨드, 이벤트 개념을 알아봤다. 시스템이 응답할 수 있는 요청에 이름을 붙이고 자체적인 데이터 구조를 제공하여 명시하는 일에 대해 알게 되었다. 이번 장에서 살펴본 이벤트, 커맨드, 메시지 버스를 통한 처리를 커맨드 핸들러(*command handler*) 라고 부르기도 한다.

아래 표는 커맨드, 이벤트 분리를 적용하기 전 살펴봐야 할 트레이드오프다:

| 장점 | 단점 |
| --- | --- |
| 커맨드와 이벤트를 다른 방식으로 처리하면, 어떤 부분이 반드시 성공해야 하는지, 나중에 정리해도 되는지를 구별하는데 도움이 된다 | 커맨드와 이벤트의 의미적 차이가 사람마다 다를 수 있다. 둘 사이의 차이를 구성원 모두가 동의하는 데 시간을 써야할 수도 있다 |
| CreateBatch 는 BatchCreated 보다는 의도가 훨씬 명시적이다 | 실패를 명확히 구별한다. 프로그램이 깨질 수 있다는 사실을 알고, 실패를 더 작고 격리가능한 단위로 나누기로 결정한다. 이를 통해 시스템 추론이 더 어려워지고 모니터링의 중요성이 대두된다 |

11장에서는 이벤트를 통합 패턴으로 쓰는 법에 대해 알아보자.

---

[^1]: *actor* 라고 써져있다. 그런데 DDD에서 쓰는 그 Actor 같기도 해서, 음차해서 쓰는 편이 나을 것으로 판단했다.

[^2]: 13장에서 개조할 클래스 형식의 메시지 버스에 대한 일부분이다. 13장 코드를 미리 살펴보면 아예 핸들용 클래스로 따로 떨어져있고, 시스템 구동 시의 부트스트랩에서 의존성을 모두 깔끔하게 처리한다. 지금 한큐에 이해하긴 힘들고, 한번에 느리게 하기보단 차라리 못생긴 모습을 들고가서 추후에 바꾸려고 한다. 이런 방안이야말로 어쨌거나 더 빠르게 문제를 해결하는 방법이니까…

[^3]: 대충 이런 상품이 있다고 생각해주세요

[^4]: `Product.allocate()` 은 내부적으로 `Batch.can_allocate()` 로직을 거치기 때문
