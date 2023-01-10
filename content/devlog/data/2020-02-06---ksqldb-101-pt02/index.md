---
title: "ksqlDB 101, part 2. Kafka Streams에 대해"
date: "2020-02-17T19:00:00.000Z"
template: "post"
draft: false
slug: "/devlog/data/2020-02-17-ksqldb-101-pt01"
category: "devlog"
tags:
  - "data_processing"
description: "ksqlDB의 내부 구조인 Apache Kafka의 Kafka Streams를 간략하게 살펴봅시다."
socialImage: "./media/__j__.jpg"
---

이 글은 `ksqlDB`(당시에는 `KSQL`이라는 명칭이었습니다)를 학습하기 위해 정리한 연재글입니다.

이 글의 순서는 아래와 같습니다.

# 목차

1. [part 1. 배경지식](https://blog.s3ich4n.me/devlog/data/2020-02-05-ksqldb-101-pt01)
1. part 2. Kafka Streams에 대해
1. [part 3. 실전 예시: 오픈소스를 통해 살펴보는 실시간 보안 이벤트 탐지 룰](https://blog.s3ich4n.me/devlog/data/2020-03-10-ksqldb-101-pt03)

# 2. Kafka Streams details

상술하였던 아파치 카프카의 API에 대해 상세히 살펴봅시다.

## Stream 이란?

아파치 카프카에서의 Stream이 무슨의미를 지니는지 살펴봅시다.

- 말 그대로 물줄기처럼 연속성있는 real-time flow of records를 의미합니다.
- 새 레코드를 달라고 명시적으로 하는게 아니라 계속해서 받는것을 의미합니다.
- 스트림은 `[k|v] -> [k|v] -> [k|v] -> [k|v]` 모양으로 계속 흐르며, `[k|v]` 한 쌍은 데이터 레코드라고 부릅니다.

### 그렇다면 Kafka Stream은 무엇을 의미하나요?

- real-time 앱을 작성하는데 쓰입니다.
  - 카프카 브로커 위에서 작동하는게 아님에 유의합니다. 별도의 앱임을 의미합니다!
- Java/Scala로 만들어진 마이크로서비스(JVM application)입니다.
  - Python 구현체로는 [Faust](https://github.com/faust-streaming/faust) 가 있습니다.
- Deploy 후 앱을 구동해야 작동합니다.
- scalable하게 늘릴 수 있다.
- kafka streams API는 데이터를 변환/강화(enrichment) 하는데 쓰입니다. (이하 내용은 후술될 것입니다.)
  - per-record 스트림 프로세싱을 밀리초 단위로 지원합니다.
  - stateless processing(Filtering, Mapping의 개념)을 지원합니다.
  - 이전 스트림의 처리 결과와 관계없이 현재 데이터로만 처리를 함을 의미합니다.
  - stateful processing(JOIN, AGGREGATION의 개념)을 지원합니다.
  - windowing operations 를 지원합니다.

## Kafka Streams의 주요 용어

카프카 스트림의 주요 용어에 대해 살펴보겠습니다.

- 스트림 처리 애플리케이션(Stream Processing Application)

  - 카프카 스트림 클라이언트를 사용하는 애플리케이션. 하나 이상의 프로세서 토폴로지에서 처리되는 로직을 의미한다.
  - 프로세서 토폴로지는 스트림 프로세서가 서로 연결된 그래프를 의미한다.
  - 스트림으로 정제한 데이터를 흘려보내는 앱을 의미

- 스트림 프로세서(Stream Processor)

  - 프로세서 토폴로지를 이루는 하나의 노드.
  - 데이터를 받고 처리하거나(소스 프로세서), 받기만 한다(싱크프로세서)

- 소스 프로세서(Source Processor)

  - 위쪽으로 연결된 프로세서가 없는 프로세서를 말한다.
  - 하나 이상의 카프카 토픽에서 데이터 레코드를 읽어서 아래쪽 프로세서에 전달한다.

- 싱크 프로세서(Sink Processor)
  - 토폴로지 아래쪽에 프로세서 연결이 없는 프로세서
  - 상위 프로세서로부터 받은 데이터 레코드를 카프카 **특정 토픽에 저장**한다.

![Kafka Streams의 도식. 상기 내용들이 표시되어 있습니다.](https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=http%3A%2F%2Fcfile29.uf.tistory.com%2Fimage%2F99AFC23E5C98CDEA2D64B0)

### `KStream`과 `KTable`이란?

- `KStream`은 stream의 abstraction입니다.
- stream of records를 원하면 `KStream`을, changelog 주어진 키에 대해 가장 최신값만 원한다면 `KTable`을 사용하는 것이 좋습니다.

### `KStream`과 `KTable`의 차이?

- `KStream`

  - an unbounded collection of facts: immutable things; 쉬지않고 들어오는값, 바뀔 수 없는(immutable) 하나의 메시지를 의미합니다.
  - e.g. `postgres.exe` 프로세스에 대한 1500번 이벤트가 10월 31일, A클라이언트에서 발생했다 (서로 독립적)

- `KTable`
  - a collection of evolving facts; 변하는 프로파일
  - e.g. 다섯달 전엔 대구에 살았는데 지금은 서울에 산다.. 하고 업데이트; Overwrite하는 경우를 의미하지요.
  - `KTable` 은 time-evolving stream 과 관련있습니다. 시간이 흐름에 따라 값이 변화하는 스트림에 주로 사용될 수 있겠습니다.

### Kafka Streams의 `Time`의 개념

스트림 프로세싱의 핵심은 시간을 가지고 작업하는 개념입니다.

- event time

  - 레코드가 emit 되는 시점의 시간

- ingestion time

  - emitted records 가 브로커에 의해 Kafka 토픽에 저장되는 시간(데이터 통신 메커니즘에 따라 이벤트 시간 및 처리 시간이 달라짐) 대부분의 경우 타임 스탬프가 데이터 레코드 자체에 포함되므로 처리 시간은 이벤트 시간과 거의 같다

- processing time
  - 스트림 처리 응용 프로그램에서 이벤트 또는 데이터 레코드를 처리하는 시점(예 : 레코드가 소비되는 시점). 처리 시간은 원래 이벤트 시간보다 밀리 초, 시간 또는 며칠이 걸릴 수 있다

### Stateful, Stateless in ksqlDB

- 상태가 필요없이 다른 메시지와 독립적으로 처리하는 것을 _stateless_ 라고 일컫습니다.
- 한 스트림을 변환만 할 필요가 있을 때, 혹은 상태에 맞게 스트림을 걸러내는 것을 말합니다.
- 상태를 필요로 하는 것을 _stateful_ 이라고 하며, 대부분의 앱은 상태를 필요로 합니다. stateful한 스트림은 input 스트림을 join, aggregate, window 처리할 수 있습니다.

## Kafka Streams 앱 구현: Java

- [이 영상](https://www.youtube.com/watch?v=7JYEEx7SBuE)을 참고해주세요.
- 소스코드는 [여기](https://github.com/confluentinc/kafka-streams-examples) 를 참고 바랍니다.

1. config 변수를 만들어서 `APPLICATION_ID_CONFIG`, `BOOTSTRAP_SERVERS_CONFIG`을 설정합니다.
   - `APPLICATION_ID_CONFIG`: 새로 만들 필터링 앱의 이름 (unique)
   - `BOOSTRAP_SERVERS_CONFIG`: 데이터 스트림을 가져올 카프카의 주소
1. `new StreamsBuilder()` 구문으로 빌더를 만들고(토폴로지 정의 빌더), `KStream` 변수타입을 사용해서 어느 토픽에 어떤 필터로 값을 가져올지 정합니다.
1. 그 후 `KafkaStreams` 타입의 변수를 만들고 빌더, 설정값을 세팅합니다.
1. `kafka stream` 설정을 입력합니다.
1. `KStream`, `KTable` 및 `GlobalKTable`을 정의합니다 (앞서 입력한 설정을 추가)
1. `KafkaStreams` 객체를 선언하고 consume 을 통해 새로운 스트림 생성합니다.

## Faust: Python의 스트림 프로세싱 라이브러리

```Python
import os

import faust


CONSUMER_NAME = "TEST_CLICK_CONSUMER_01"
KAFKA_BROKER = "임의의 브로커 주소"
SRC_TOPIC = "임의의 토픽주소"

# 앱 구동 전, 기본 설정값 세팅
app = faust.App(
    CONSUMER_NAME,
    broker=f"kafka://{KAFKA_BROKER}",
)

# 값을 가져오기위한 메인토픽
# data sent to 'clicks' topic sharded by URL key.
# e.g. key="http://example.com" value="1"
click_topic = app.topic(
    SRC_TOPIC,
    key_type=str,
    value_type=int,
)

# 새로이 저장할 토픽
# default value for missing URL will be 0 with `default=int`
counts = app.Table(
    'click_counts',
    default=int,
)

@app.agent(src_topic)
async def count_click(clicks):
    async for url, count in clicks.items():
        counts[url] += count
```

도커 이미지를 아래와 같이 작성 후 구동하면 파이썬 코드로도 상기 Kafka Streams 처리가 가능합니다.

```Dockerfile
FROM python:3.9

COPY . /app
WORKDIR /app

RUN \
    pip install -r requirements.txt

RUN ["python", "stream.py"]
```

Faust 에 대한 상세한 설명은 [여기](https://faust-streaming.github.io/faust/userguide/index.html)를 살펴봐주세요.

### Caveats

만일 파이썬 베이스 이미지를 통해 [librdkafka 기반의 카프카 처리 라이브러리](https://github.com/confluentinc/confluent-kafka-python)를 사용해야 한다면, 추가적인 의존성을 필요로 할 수 있습니다. 관련 내용은 [이 링크](https://github.com/confluentinc/confluent-kafka-python/blob/master/INSTALL.md)를 참고해주세요.

# 마무리

이번 글을 통해, 아래 내용들을 살펴볼 수 있었습니다:

1. Kafka Streams과 주요 용어 및 개념을 살펴보았습니다.
2. Kafka Streams 앱 구현을 Java 및 Python 라이브러리를 통하여 어떻게 진행하는지 살펴보았습니다.

다음 파트에선 본격적으로 ksqlDB가 무엇인지, 그리고 이를 통해 어떤식으로 실시간 이벤트 처리를 수행할 수 있는지를 대표적인 예시로 살펴보겠습니다.

읽어주셔서 대단히 감사합니다.

---

- References
  - [Kafka Streams Introduction](https://docs.confluent.io/current/streams/introduction.html)
  - [Introduction to Schemas in Apache Kafka with the Confluent Schema Registry](https://medium.com/@stephane.maarek/introduction-to-schemas-in-apache-kafka-with-the-confluent-schema-registry-3bf55e401321)
  - [KSQL and Kafka Streams](https://github.com/kafkakru/meetup/blob/master/conference/1st-conference/KSQL%20vs%20Kafka%20Streams.pdf)
  - [Faust: Python Stream Processing](https://faust.readthedocs.io/en/latest/)
