---
title: "파이썬으로 살펴보는 아키텍처 패턴 (11)"
date: "2023-05-18T03:41:09.000Z"
template: "post"
draft: false
slug: "/books/cosmic-python/2023-05-18-pt02-ch10"
category: "books"
tags:
  - "ddd"
  - "books"
  - "backend"
  - "python"
description: "파이썬으로 살펴보는 아키텍처 패턴을 읽고 이해한 내용을 작성합니다. 챕터 11, 이벤트 기반 아키텍처: 이벤트를 사용한 마이크로서비스 통합에 대한 내용입니다."
socialImage: { "publicURL": "./media/universe.jpg" }
---

이 내용은 "파이썬으로 살펴보는 아키텍처 패턴" 을 읽고 작성한 내용입니다. 블로그 게시글과, 작성한 코드를 함께 보시면 더욱 좋습니다.

11장은 해당 코드를 살펴봐주세요. [코드 링크](https://github.com/s3ich4n/cosmicpython-study/tree/main/pt2/ch11)

# 11장 이벤트 기반 아키텍처: 이벤트를 사용한 마이크로서비스 통합

제목 길다ㅋㅋ

이전 장에서는 실제로 '배치 수량이 변경됨' 이라는 이벤트를 어떻게 받을 수 있는지, 재할당에 대해 외부 세계에 어떻게 통지할 수 있는지에 대해서는 논하지 않았다.

현재까지 만든건 웹 API가 있는 마이크로서비스 한 개다. 다른 시스템과 이야기하는 다른 방법을 생각해보자. 선적이 지연되거나, 수량이 변경되거나 하는건 시스템이 어떻게 알 수 있을까? 시스템이 창고 시스템에게 주문이 할당되었고 다른 고객에게 운송되어야 한다고 어떻게 이야기할 수 있을까?

이번 장에서는 이벤트 비유를 확장하여 시스템으로 들어오거나 시스템에서 나가는 메시지까지 포용하는 방안을 살펴본다. 여지껏 애플리케이션의 핵심은 메시지 처리기가 되도록 바꾸었다. 이제는 외부로도 이를 처리할 수 있도록 작업해보자.

외부 이벤트가 들어오는 것은 외부 메시지 버스(이 책에서는 Redis의 pub/sub 대기열을 예제로 사용한다)를 통해 subscribe 하고, 출력은 이벤트 형태로 외부 메시지 버스에 publish 한다. 

![이제 애플리케이션은 메시지 처리기가 되었다](https://www.cosmicpython.com/book/images/apwp_1101.png)

# 11.1 분산된 진흙 공, 명사로 생각하기

책의 저자는 마이크로서비스 아키텍처(이하 MSA)를 구축하는 사람과 자주 이야기하며 기존 앱을 마이그레이션하는 논의를 자주 한다고 한다. 이 때 본능적으로 하는 일은 시스템을 명사화 하는 것이다.

현재까지의 시스템에 도입된 명사들을 생각해보자. 재고 배치, 주문, 상품, 고객 등이 있다. 이를 그림과 같이 나누었다. (참고: ‘할당’이라는 동작 대신, ‘배치’라는 명사를 기준으로 이름이 붙어졌음)

![명사 기반 서비스의 컨텍스트 다이어그램](https://www.cosmicpython.com/book/images/apwp_1102.png)

이 시스템의 ‘물건’ 마다 연관된 서비스가 있고, 그 서비스는 HTTP API를 노출한다.

아래 command flow 1을 통해 정상경로(*happy path*) 를 진행해보자.

1. 사용자가 웹 사이트에 방문하여 재고가 있는 상품을 선택한다
2. 상품을 장바구니에 담고 재고를 예약한다
3. 주문이 완료되면 예약을 확정하고 창고에 출고를 지시한다
4. `3`번째 주문일 경우 고객 레코드를 변경하여 일반 고객을 VIP로 승격시킨다

![커맨드 플로우 1](https://www.cosmicpython.com/book/images/apwp_1103.png)

각 단계를 이런 커맨드로 생각해볼 수 있겠다:

1. `ReserveStock`
2. `ConfirmReservation`
3. `DispatchGoods`
4. `MakeCustomerVIP`

이런 스타일의 아키텍처에서는 DB 테이블 단위로 마이크로서비스를 만들고, HTTP API를 빈약한(비즈니스 로직이 없는) 모델에 대한 CRUD 인터페이스로 취급하며, 서비스 중심의 설계를 처음 하는 사람들이 취하는 방식이다.

간단하면 잘 돌겠지만, 금방 복잡해진다(!!!). 왜냐면 실패 케이스에 대한 고려가 없기 때문이다. 이런 케이스에 대해 살펴보자:

1. 재고가 도착했는데 배송 중 물에의해 손상된 경우가 있다. 이걸 팔 수는 없으니 폐기하고 다시 재고요청을 해야한다
2. 이 경우에는 재고 모델을 업데이트 해야할 수도 있고, 그로인해 고객의 주문을 재할당 해야할 수도 있다

이런 기능들을 어디에 넣어야할까? 대충 봤을 땐(!) 창고 시스템이 하면 될 것 같다. 아래와 같은 command flow 2가 나올 것이다.

![커맨드 플로우 2: 창고 시스템이 이런 처리를 담당하는 경우](https://www.cosmicpython.com/book/images/apwp_1104.png)

잘 돌아간다. 그렇지만 의존성 그래프가 지저분해진다. 왜인지 보자:

1. 재고를 할당하려면 '주문 서비스'가 '배치 시스템'을 제어해야 한다
2. '배치 시스템'은 다시 '창고 시스템'을 제어한다
3. 창고에 생긴 문제를 해결하려면 '창고 시스템'은 '배치 시스템'을 제어하고, '배치 시스템'은 주문을 제어한다

이 경우 시스템이 제공해야 하는 다른 워크플로우의 숫자만큼 곱한다. 이래선 빠르게 결과를 만들어내는 것만 못한 시스템이 나온다..!

# 11.2 분산 시스템에서 오류 처리하기

'모든 것은 망가진다(*Things break*)'는 소프트웨어 엔지니어링에서 일반적인 규칙이다. 어떤 요청이 실패하면 시스템에 어떤 일이 발생하는지 살펴보자.

예를 들어, 사용자가 `MISBEGOTTEN-RUG` 에 대해 3개를 주문받고 네트워크 오류가 발생했다 가정하자:

![오류가 발생한 명령 흐름](https://www.cosmicpython.com/book/images/apwp_1105.png)

이에 대한 두 가지 처리방법이 있다.

1. 주문은 넣지만 할당을 하지 않거나 할당을 보장할 수 없으므로, 최종적으로 주문을 거부한다. 이 실패를 위로 전달한다 → 주문 서비스의 신뢰성에 영향을 끼칠것이다!
    - 두 가지를 함께 바꿔야 하는 경우를 결합되었다(*coupled*) 라고 한다
    - 이런 식의 연쇄적 실패는 시간적 결합(*temporal coupling*) 이라고 부른다
    - 시스템의 모든 부분이 동시에 제대로 작동할 때만 정상적으로 작동하는 경우를 시간적 결합이라고 한다
    - 시스템이 커지면 시스템 부품 중 일부의 성능이 나빠질 확률이 기하급수적으로 높아진다(*exponentially incresing probability*)
    - 아래 동시생산 절을 살펴보자
2. 11.3절에서 이에 대한 대안을 작성할 것이다

## 11.2.1 동시생산(*Connascence*)?

본 책에서는 결합(*coupling*) 이란 말을 사용하나, 시스템 상 현재 예제와 같은 관계를 동시생산(*connascence*)[^1] 라고도 일컫는다. 이는 다른 유형의 결합을 묘사할 때 사용하는 용어다.

동시생산은 나쁘지 않다. 그렇지만 어떤 동시생산 케이스는 다른 케이스보다 더 강하다. 보통은 두 클래스가 밀접하게 연관되어(*closely related*)있으면 강한 동시생산을 지역적으로만 한정시키고 그렇지 않으면 약한 생산으로 떼어놓고자 한다.

위에서 살펴본 커맨드 플로우 2 예시에서는 [실행의 동시생산](https://connascence.io/execution.html)(*connascence of execution*)을 살펴볼 수 있다. 연산이 성공하려면 여러 구성요소의 **정확한** 작업 순서를 알고 있어야 한다.

여기서는 오류가 발생하는 경우에서는 [타이밍의 동시생산](https://connascence.io/timing.html)(*connascence of timing*)을 살펴볼 수 있다. 한 가지 일이 **일어난 직후 바로 다음** 일이 일어나야 한다.

~~RPC 이야기는 이해못해서 기재하지 않음~~ 이름의 동시생산(*connascence of name*)에 대해 언급한다.

소프트웨어가 다른 소프트웨어와 통신하지 않는 경우를 제외하고는 **결합을 완전히 피할 수 없다. 다만 부적절한 결합만큼은 피해야 한다.** 동시생산은 서로 다른 아키텍처 스타일에 내재된 결합의 강도와 유형을 이해하기 위한 멘탈 모델(*mental model*)을 제공한다.

# 11.3 대안: 비동기 메시징을 사용한 시간적 결합

적절한 결합을 얻기 위해선 명사가 아니라 동사로 생각해야 한다는 점을 살펴봤다. 도메인 모델은 비즈니스 프로세스를 모델링하기 위함이다. 도메인 모델은 어떤 물건에 대한 정적인 데이터 모델이 아닌 동사에 관한 모델이다.

따라서 주문에 대한 시스템과 배치에 대한 시스템을 생각하는 것이 아니라, 주문 행위(*ordering*) 에 대한 시스템과 할당행위(*allocating*)에 대한 시스템을 생각한다.

이런 식으로 사물을 구별하면 어떤 시스템이 어떤 일을 하는지에 대해 생각하기 쉽다. 주문 행위에 대해 생각해보면, **주문을 넣었을 때 주문이 들어간다는 무조건 되어야 한다**. 다른 모든 일은 언젠가 발생한다는 것만 보장할 수 있다면 **나중에** 발생할 수 있다.

> 📒 **NOTE** 📒

애그리게이트와 커맨드 설계 시 수행했던 책임 분리가 바로 이것이다.
> 

마이크로서비스 또한 **일관성 경계**(*consistency boundaries*)여야 한다. 두 서비스에는 최종 일관성을 받아들일 수 있고, 이는 동기화된 호출에 의존하지 않아도 된다는 뜻이다. 각 서비스는 외부 세게에서 커맨드를 받고 결과를 저장하기 위해 이벤트를 발생시킨다. 이런 이벤트를 수신하는 다른 서비스는 워크플로우의 다음 단계를 트리거링한다.

이런 식으로 *쉽게 복잡해지기 쉬운 구조*[^2]를 방지하기 위해 시간적으로 결합된(*temporally coupled*) 메시지가 업스트림 시스템으로부터 외부 메시지로 도착하길 바란다. 시스템은 이벤트를 리슨하는 다운스트림 시스템을 위해 `Allocated` 이벤트를 publish한다.

왜 이런 구조가 더 나은지에 대한 근거는 아래와 같다:

1. 각 부분이 서로 독립적으로 실패할 수 있다. 잘못된 동작이 발생했을 때 처리하기 더 쉽다. 어떤 시스템이 안되더라도 여전히 처리할 수 있기는 하다
2. 시스템 사이의 결합 강도를 감소시킬 수 있다. 처리 연산순서를 바꾸거나 새 단계를 추가하더라도 이를 지역적으로 처리할 수 있다

# 11.4 Redis의 Pub/Sub Channel을 통합에 사용하기

그렇다면 이를 할 수 있는 메시지 버스가 필요하다. 이는 이벤트를 안팎으로 처리할 수 있는 인프라를 의미한다. 흔히들 **메시지 브로커**(*message broker*) 라고 부른다. 메시지 브로커의 역할은 publisher로부터 메시지를 받아서 subscriber에게 전달[^3](*deliver*)하는 것이다.

made.com(진짜 영국의 가구서비스임)에서는 [Event Store](https://www.eventstore.com/) 라는 서비스를 쓴다. [Kafka](https://kafka.apache.org/)나 [RabbitMQ](https://www.rabbitmq.com/)도 좋은 대안이다. 책에서는 [Redis pub/sub channel](https://redis.io/docs/manual/pubsub/)를 사용할 것이다.

> 📒 **NOTE** 📒

메시징 플랫폼을 선택하는 주요 방안으로는 주로 메시지 순서, 실패 처리, 멱등성(*idempotency*) 등이 있다. 이는 14.8절에서 다시 살펴보자!
> 

그렇다면 새로운 흐름에 대한 시퀀스 다이어그램을 살펴보자. Redis는 전체 프로세스를 시작하는 `BatchQuantityChanged` 를 제공하고, 마지막에는 `Allocated` 이벤트를 Redis에 publish 한다.

![재할당 흐름의 시퀀스 다이어그램](https://www.cosmicpython.com/book/images/apwp_1106.png)

# 11.5 엔드투엔드 테스트를 사용하여 모든 기능 시범운영하기

어떤 식으로 수행하는지 살펴보자. API를 사용하여 배치를 만들고, 인바운드-아웃바운드 메시지를 테스트할 것이다

> 여기서 잠깐!

나는 현재 DB 커넥션도 Dependency Injector를 통해 구현했는데, Redis도 마찬가지일 것이다. [이런 예시](https://python-dependency-injector.ets-labs.org/examples/fastapi-redis.html)를 프로젝트에 맞게 구현할 것이다. 아래 방안을 작성하고자 한다:

1. Redis 커넥션에 대해 깔끔하게 처리하는 방안 모색
2. 그렇게 처리하면서 동시에 pub/sub을 쓸 수 있는지도 모색
> 

이 로직을 테스트하기 위해선 아래 테스트코드가 필요하다:

```python
@pytest.mark.asyncio
async def test_change_batch_quantity_leading_to_reallocation(client):
    # 두 배치와 할당을 수행하여 한 쪽에 할당하는 주문으로 시작한다.
    orderid, sku = random_orderid(), random_sku()
    earlier_batch, later_batch = random_batchref("old"), random_batchref("newer")
    await post_to_add_batch(client, earlier_batch, sku, qty=10, eta="2023-01-01")
    await post_to_add_batch(client, later_batch, sku, qty=10, eta="2023-01-02")
    response = await post_to_allocate(client, orderid, sku, 10)
    assert response.json()["batchref"] == earlier_batch

    subscription = await redis_client.subscribe_to("line_allocated")   # 1)

    await redis_client.publish_message(                                # 2)
        "change_batch_quantity",
        {"batchref": earlier_batch, "qty": 20},
    )

    messages = []
    async with async_timeout.timeout(3):                               # 3)
        message = await subscription.get_message(timeout=1)
        if message:
            messages.append(message)
            print(messages)

    assert len(messages) == 1
    data = json.loads(messages[-1]["data"])
    assert data['order_id'] == orderid
    assert data["batchref"] == later_batch
```

1. `line_allocated` 라는 채널을 listen 한다.
2. 외부 서비스가 `change_batch_quantity` 라는 채널에 아래 dict 값을 가진 이벤트를 전송함을 의미한다.
3. 책에서는 `tenacity` 를 사용해서 3번 정도를 더 수신하도록 기다린다

## 11.5.1 Redis는 메시지 버스를 감싸는 다른 얇은 어댑터

Redis pub/sub 리스너, 혹은 이벤트 소비자(*event consumer*)는 외부 서비스로부터 메시지를 받고 변환하여 이를 이벤트로 만든다.

아래는 Redis메시지 리스너의 간단한 버전이다:

```python
async def main():
    orm.start_mappers()
    pubsub = r.pubsub(ignore_subscribe_messages=True)
    await pubsub.subscribe("change_batch_quantity")   # 1)

    async for m in pubsub.listen():
        await handle_change_batch_quantity(m)

async def handle_change_batch_quantity(m):
    logging.debug("handling %s", m)
    data = json.loads(m["data"])                      # 2)
    cmd = commands.ChangeBatchQuantity(ref=data["batchref"], qty=data["qty"])
    await messagebus.handle(cmd, uow=unit_of_work.SqlAlchemyUnitOfWork())

if __name__ == "__main__":
    asyncio.run(main())
```

1. 이 어댑터를 구동하며 `change_batch_quantity` 채널을 subscribe 한다
2. 엔트리포인트에서는 JSON 역직렬화 후 커맨드로 변환하여 서비스 계층으로 메시지를 전달한다. API가 하는일과 동일하다!

그렇다면 Redis 이미지 publisher 또한 살펴보자.

```python
async def publish(channel, event: events.Event):       # 1)
    logging.debug("publishing: channel=%s, event=%s", channel, event)
    await r.publish(channel, json.dumps(asdict(event)))
```

1. 여기선 하드코딩한 채널을 사용한다. 이벤트 클래스/이름과 적절한 채널을 매핑하는 정보를 저장할 수도 있다. 이러면 메시지 유형 중 일부에 대해 다른 채널을 사용할 수도 있다

## 11.5.2 외부로 나가는 새 이벤트

`Allocated` 라는 이벤트를 살펴보자

```python
@dataclass
class Allocated(Event):
    orderid: str
    sku: str
    qty: int
    batchref: str
```

이 이벤트로는 주문 라인 상세정보, 어떤 배치에 주문라인이 할당되었는지 등 할당에 대해 알아야 할 필요가 있는 모든 내용을 저장한다.

이를 모델의 `allocate()` 메소드에 추가한다. 이를 위한 테스트를 함께 추가하자.

```python
def test_product_allocate_should_emit_an_event():
    batch = Batch('batch1', 'SMALL-FORK', 10, eta=today)
    product = Product(sku='SMALL-FORK', batches=[batch])
    allocation = product.allocate(OrderLine('order1', 'SMALL-FORK', 1))

    expected_event = events.Allocated(
        orderid="order1",
        sku="SMALL-FORK",
        qty=1,
        batchref=batch.reference,
    )

    assert product.messages[-1] == expected_event
    assert allocation is "batch1"
```

이런 류의 테스트가 있어야겠고, `Product` 애그리게이트에는 이벤트 emit하는 로직이 있어야 할 것이다.

```python
class Product:
    def __init__(
            self,
            sku: str,
            batches: List[Batch],
            version_number: int = 0,
    ):
        ...
    def allocate(
            self,
            line: OrderLine,
    ) -> str:
        ...
            self.version_number += 1
            self.messages.append(              # 1)
                events.Allocated(
                    orderid=line.orderid,
                    sku=line.sku,
                    qty=line.qty,
                    batchref=batch.reference,
                )
            )
            return batch.reference
        ...
```

1. 이런 식으로 `Allocated` 이벤트를 담아야한다.

그 후에는 메시지 버스에도 관련 핸들러를 추가해주고, 이벤트 발행할 때는 레디스 wrapper가 제공하는 헬퍼함수를 쓰자.

```python
class MessageBus:
    EVENT_HANDLERS = {
        events.Allocated: [handlers.publish_allocate_event],    # 1)
        events.OutOfStock: [handlers.send_out_of_stock_notification], 
    }   # type: Dict[Type[events.Event], List[Callable]]

async def publish_allocate_event(
        event: events.Allocated,
        uow: unit_of_work.AbstractUnitOfWork,
        channel: redis.AsyncRedis,
):
    await channel.publish("line_allocated", event)              # 2)
```

1. 이런 식으로 핸들러를 추가하고
2. wrapper함수는 이렇게 감싸준다

레디스 커넥션 처리는 Dependency Injector로 이렇게 했다

```python
class Container(containers.DeclarativeContainer):
    __self__ = providers.Self()

    config = providers.Configuration()
    config.from_pydantic(Settings())

    wiring_config = containers.WiringConfiguration(    # 1)
        packages=[
            "pt2.ch11.src.allocation.entrypoints",
        ]
    )

    redis_pool = providers.Resource(                   # 2)
        redis.init_redis_pool,
        redis_uri=config.broker.REDIS_URI,
    )

    redis = providers.Factory(                         # 3)
        redis.AsyncRedis,
        session=redis_pool,
    )

```

1. 하기 팩토리를 사용할 Wiring 대상인 “패키지”의 경로를 기재했다. 아래 소스를 함께 살펴본다
2. 리소스를 이렇게 만들어줄 수 있다. 이 리소스는 하기 팩토리에 사용된다
3. 팩토리를 통해 `AsyncRedis` 라는 클래스의 의존성을 주입한다

```python
class AsyncRedis:
    def __init__(
            self,
            session: redis.Redis,
    ):
        self._session = session         # 1)

    async def publish(                  # 2)
            self,
            channel,
            event: events.Event,
    ):
        await self._session.publish(channel, json.dumps(asdict(event)))

from fastapi import Depends                                             # 3)

@app.post(
    "/allocate",
    status_code=status.HTTP_201_CREATED,
)
@inject
async def allocate_endpoint(
        order_line: OrderLineRequest,
        channel: redis.AsyncRedis = Depends(Provide[Container.redis]),  # 3)
):
    ....
        batchref = await messagebus.handle(
            ...
            channel=channel,
        )

@inject
async def signup_user(
        channel: redis.AsyncRedis = Provide[Container.cache],           # 4)
):
    return jsonify({"status": await cache.ping()})
```

1. 상기 세션값은 이런식으로 넣는다
2. Wiring을 수행한 측에서는 `redis.publish(channel, event)` 형식으로 사용하면 된다. 이 때 Wiring을 위해 아래 3, 4와 같은 구문을 사용한다
3. FastAPI에서는 `from fastapi import Depends` 를 해주고 의존성 주입을 한다
4. Flask라면 이런 식으로 의존성 주입을 한다

## 11.6 내부 이벤트와 외부 이벤트 비교

내부 외부 이벤트의 구분이 명확할 필요가 있다. 일부 이벤트는 밖에서 들어오지만, 일부 이벤트는 승격되며 외부에 이벤트를 publish 할 수도 있다. 하지만 모든 이벤트가 외부에 이벤트를 emit하지는 않는다. [이벤트 소싱](https://io.made.com/blog/2018-04-28-eventsourcing-101.html)에 대해서는 저자가 작성한 글을 함께 읽어보자.

> TIP

외부로 나가는 이벤트는 검증을 적용하는 것이 중요한 부분에 속한다. Appendix E 도 함께 살펴보자.
> 

## 11.7 마치며

이벤트는 외부에서 들어올 수도, 외부로 emit할 수도 있다. `publish` 핸들러는 이벤트를 Redis 메시지 채널의 메시지로 변환한다. 이런즉 이벤트를 사용해 외부 세계와 이야기를 나누는 식의 시간적인 결합을 이용하자. 그렇다면 애플리케이션 통합 시 상당한 유연성을 얻을 수 있다. 하지만 흐름이 명시적이지 않고 디버깅이나 변경이 어려워질 수도 있다. 이 말을 누가했냐고? [마틴 파울러가 했다](https://martinfowler.com/articles/201701-event-driven.html).

이벤트 기반 마이크로서비스 통합의 트레이드오프를 살펴보자:

| 장점 | 단점 |
| --- | --- |
| 분산된 큰 진흙 공을 피할 수 있다 | 전체 정보 흐름을 알아보기 어렵다 |
| 서비스가 서로 결합되지 않는다. 개별 서비스 변경 및 새 서비스 추가가 쉽다 | 일관성은 처리할 필요가 있는 새로운 개념이다
(이걸 해결하기 위해 SAGA 패턴이나 이벤트 소싱, CQRS가 있다고 하는데, 더 공부해보자) |
|  | 메시지 신뢰성과 at-least-once(최소 한 번) versus at-most-once(최대 한 번)을 서로 생각해봐야 한다 |

---

[^1]: [Connascence](https://connascence.io/)은 Meilir Page-Jones가 주장한 개념이다.

[^2]: 원문에선 Distributed Ball of Mud antipattern 이라고 했다. 이런 설계가 안티패턴임을 시사하는 비꼬기 같은데 이걸 어케 번역함ㅋㅋ

[^3]: 책에선 ‘배달’ 이란 용어를 쓰는데, 난 이게 더 익숙해서 이렇게 풀거다. 아니면 딜리버라고 바로 말하거나, 영단어를 바로 쓰거나…
