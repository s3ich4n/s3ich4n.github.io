---
title: "ksqlDB 101, part 1. 배경지식"
date: "2020-02-05T05:14:00.000Z"
template: "post"
draft: false
slug: "/devlog/data/2020-02-05-ksqldb-101-pt01"
category: "devlog"
tags:
  - "data_processing"
description: "ksqlDB를 어느정도 이해하기 위해 필요한 기본지식을 설명하였습니다."
socialImage: { "publicURL": "./media/__j__.jpg" }
---

이 글은 `ksqlDB`(당시에는 `KSQL`이라는 명칭이었습니다)를 학습하기 위해 정리한 연재글입니다.

이 글의 순서는 아래와 같습니다.

# 목차

1. part 1. 배경지식
1. [part 2. Kafka Streams에 대해](https://blog.s3ich4n.me/devlog/data/2020-02-17-ksqldb-101-pt01)
1. [part 3. 실전 예시: 오픈소스를 통해 살펴보는 실시간 보안 이벤트 탐지 룰](https://blog.s3ich4n.me/devlog/data/2020-03-10-ksqldb-101-pt03)

# 1. ksqlDB를 알기 위해 필요한 것들

ksqlDB를 이해하고 효율적으로 사용하기 위해 아래 기능들에 대해 이해하고 넘어갈 필요가 있습니다.

- (필수) Apache Kafka에 대한 기본적인 이해
- (필수) Kafka Streams
- (선택...이지만 사실상 필수라고 생각합니다) Schema Registry

## 사전 학습: 아파치 카프카의 API들에 대하여

아파치 카프카의 몇몇 API에 대한 설명을 살펴봅시다. [이 링크](https://kafka.apache.org/documentation/#api)를 살펴본다면 ksqlDB를 살펴볼 때에도 도움이 될 것입니다.

- Producer API: 특정 앱이 레코드 스트림을 발행하고 하나 이상의 카프카 토픽에 보내는 기능
- Consumer API: 특정 앱이 하나 이상의 토픽을 subscribe 하고 produce 받은 레코드의 스트림을 가공한다
- Streams API(Kafka Streams): 특정 앱이 stream processor로 작동하게 한다. 이는 하나 이상의 토픽으로부터 오는 input stream을 consume 하고, 하나 이상의 토픽에 produce하는 output stream을 produce한다. input stream을 output stream으로 바꾸는데 효과적이다.
- Connect API(Kafka Connects): 카프카 토픽을 다른 앱이나 데이터 시스템에 연결하는, 재사용 가능한 producer/consumer를 빌드/실행한다. 예시) RDBMS의 커넥터는 테이블의 모든 변화를 감지할 수 있다.

너무 직역이라, 이를 풀어보자면 아래와 같습니다.

1. 아파치 카프카의 프로듀서 API, 컨슈머 API는 말 그대로, 카프카 토픽을 프로듀스/컨슘 하는데 사용되는 네이티브 API 입니다.
2. 스트림 API는, 한 토픽에서 다른 토픽으로 데이터의 흐름(streams of data)을 흘려보내는 기능을 의미합니다.
3. 커넥트 API는 외부 시스템에서 카프카로 데이터를 뽑아오거나, 카프카에서 외부 시스템으로 데이터를 저장하는(sink data system이라고 일컫습니다) 기능을 의미합니다.

미리 말씀드리자면, ksqlDB는 이 스트림 API를 SQL문 작성 만으로 사용할 수 있도록 하는 애플리케이션이라 볼 수 있습니다.

## Schema Registry

- (이하 스키마 레지스트리라고 부르겠습니다)
- 상기 내용에서 보았듯, 데이터를 단순히 프로듀스/컨슘 하는 것 뿐 아니라 데이터의 흐름을 바꾸어서 다른곳에 저장하고, 또 불러오기도 합니다. 실수가 많을 수 있는 부분들에 대해 일종의 "객체화"를 수행하여, 이 데이터를 주고받도록 하면 실수가 줄겠죠.
- 카프카의 스키마 관리 도구입니다.
- 변조되거나 망가진 이벤트가 쓰이지 않도록 방지해줍니다.
- 카프카로부터 Produce/Consume 할 데이터를 정의해둔 값
- [카프카 운영 시 웬만해선 사용하기를 권장합니다!](https://kafka.apache.org/documentation/#multitenancy-more)
- 스키마를 따로 관리하는 서버입니다.
- 내부적으로 Avro, JSON 스키마, Protobuf 스키마를 사용할 수 있고 REST API로 스키마를 저장/조회할 수 있습니다.

### Avro란?

- 아파치에서 작성한 데이터 직렬화 시스템입니다.
- Avro는 Schema에 의존적입니다. 쉽게 말해, 어떤식으로 직렬화/역직렬화 될지에 대한 스펙이라고 할 수 있지요.
- Avro 스키마는 JSON으로 정의되며, JSON 라이브러리를 사용하여 작성합니다.

Avro는 스키마 정의를 아래의 방식으로 수행합니다.
• 파일타입
• 레코드의 길이
• 레코드의 이름
• 레코드 필드
• 필요한 데이터타입에 맞게 정의

아래와 같은 형식으로 담깁니다.

```json
{"type": "typeName" ...attributes...}
```

- type
  - Primitive data type일 수도 있습니다.
  - Complex type일 수도 있으며, 이 때는 `record` 라는 값을 별도로 기재합니다.
- namespace
  - 이 필드는 오브젝트가 위치한 네임스페이스를 정의합니다.
- name
  - 레코드의 이름을 가리키며, Avro API가 해당 데이터 타입을 참조할 때 쓰는 값입니다.
  - schema name은 namespace와 함께 쓰입니다. 아래 예시를 보며 이해해봅시다.

e.g. document을 정의하고 namespace는 "Test"이며 이름은 "Employee"이고 2개의 필드를 가지고있다. 각각 string 타입의 "Name", int 타입의 "Age"이다. <br /> 라고 하는 데이터 타입에 대한 Avro 정의는 아래와 같습니다.

```json
{
  "type": "record",
  "namespace": "Test",
  "name": "Employee",
  "fields": [
    { "name": "Name", "type": "string" },
    { "name": "Age", "type": "int" }
  ]
}
```

- 스키마 이름은, 위의 예시대로 쓰자면 `Test.Employee`가 되겠습니다.

Avro의 primitive data type은 아래와 같습니다.

| 데이터타입 | 상세                                   |
| ---------- | -------------------------------------- |
| `null`     | 아무값도 없는 값                       |
| `int`      | 32bit signed integer                   |
| `long`     | 64bit signed integer                   |
| `float`    | IEEE 754를 따르는 32-bit 부동소수점 값 |
| `double`   | IEEE 754를 따르는 64-bit 부동소수점 값 |
| `bytes`    | 8-bit unsigned bytes의 시퀀스          |
| `string`   | 유니코드 캐릭터 시퀀스                 |

Avro의 Complex data type은 다음과 같으며, 이는 `"type": "<complex_data_type>"` 와 같은 형태로 정의하며, 여기에서는 _일부만 소개_ 하겠습니다.

| 데이터타입 | 상세                                          |
| ---------- | --------------------------------------------- |
| Record     | 다양한 애트리뷰트들의 컬렉션                  |
| Enum       | 아이템 리스트에 대한 enumuration              |
| Arrays     | 배열 형식의 값을 담을 수 있는 데이터 타입     |
| Maps       | key, value 쌍의 값을 담을 수 있는 데이터 타입 |

그 외의 내용은 아래 링크를 통해 확인해보시기 바랍니다.

- https://avro.apache.org/docs/current/spec.html
- https://www.tutorialspoint.com/avro/avro_schemas.htm

### Avro Serializer 를 어떻게 사용하나요?

자, 원하는 타입대로 직렬화/역직렬화를 수행할 수 있도록 포맷을 정했습니다. 그 다음은 어떤 절차를 거쳐야할까요? 아래 내용을 살펴봅시다. 이 내용은 파이썬의 [confluent-kafka-python](https://github.com/confluentinc/confluent-kafka-python) 라이브러리를 통해 사용하였음을 말씀드립니다.

1. 프로듀서가 유효한 스키마를 가지고있는지 schema registry에 쿼리한다.
1. schema registry는 스키마의 유효성에 따라 다르게 처리한다:
   1. 유효하지 않다면 `KafkaAvroSerializer`를 raise한다.
   1. 유효하면 스키마 ID를 메시지에 추가하고 카프카에 쏜다.
1. 필요에 따라 produce/consume을 한다(이 내용은 상세히 봅시다!)

#### Produce 과정

[이 예시코드](https://github.com/confluentinc/confluent-kafka-python/blob/master/examples/avro_producer.py)를 살펴보시면 이해가 빠릅니다!

1. `AvroSerializer` 객체를 통해 Schema Registry 정보를 받고 직렬화/역직렬화 처리준비를 완료함
1. 카프카 정보를 받은 후 토픽에 `produce` 수행

#### Consume 과정

[이 예시코드](https://github.com/confluentinc/confluent-kafka-python/blob/master/examples/avro_consumer.py)를 살펴보시면 이해가 빠릅니다!

1. `AvroDeserializer` 객체를 통해 Schema Registry 정보를 받고 직렬화/역직렬화 처리준비를 완료함
2. 카프카 정보를 받은 후 토픽으로부터 `subscribe` 한다.
3. 값이 있으면 그때부터 계속 poll하면서 가져온다.

### 스키마 레지스트리의 작동 원리

스키마 레지스트리 호출을 언급했는데, 정확히 어떤식으로 작동하는 걸까요? 그 내용에 대해선 아래 도식을 통해 설명하겠습니다.

1. `Producer`는 Avro포맷으로 REST API에 `POST` 를 수행합니다.
2. REST interface는 Schama Registry에 스키마를 전송합니다.
   1. 그 후 카프카에 binary data를 전송합니다.
   2. 이때 binary data 에는 schema ID가 포함되어 있습니다.
3. `Consumer`는 binary data를 Kafka에서 consume합니다.
   1. 그 후 해당 정보를 가지고 스키마 레지스트리(혹은 로컬캐시)에서 스키마 정보를 탐색후 가져오고, 이를 이용하여 역직렬화합니다.

![스키마 레지스트리의 작동방식](https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fk.kakaocdn.net%2Fdn%2Fbj33QF%2FbtqxIoJpMYx%2FicoZHVOOwxU2MHH2xNva2k%2Fimg.png)

### 스키마 레지스트리 서버세팅 (Docker Compose 사용 시)

- docker-compose에 스키마 레지스트리 관련 컨테이너 설정을 추가하면 됩니다.
- docker-compose 내의 환경설정값은 `'SCHEMA_REGISTRY_'` 형태의 prefix를 붙여야합니다.

- 이 설정값은 기본적으로 체크해야 합니다.
  - `kafkastore.bootstrap.servers`: 연결할 카프카 브로커들의 리스트
  - `listeners`: HTTP(S)를 통해 API request를 받을 리스너의 리스트
  - `kafkastore.connection.url`: ZooKeeper URL
  - `host.name`: 스키마 레지스트리가 여러 노드로 작동중일 때의 설정
  - [참고 링크](https://docs.confluent.io/current/schema-registry/installation/deployment.html#important-configuration-options)

추가로 확인해야할 설정값(SSL, SASL 등의 설정이 필요하다면 아래 링크를 참조해 주세요)

- [링크](https://docs.confluent.io/current/schema-registry/installation/config.html)

deployment시 점검해야할 스펙은 아래와 같습니다:

- [링크](https://docs.confluent.io/current/schema-registry/installation/deployment.html)

서버 세팅이 완료되면, 그 후 스키마 레지스트리 서버에 대해 API 요청을 테스트해볼 수 있습니다:

- schema 등록
- schema 조회
- [링크](https://docs.confluent.io/current/schema-registry/develop/api.html)

### 스키마 레지스트리의 장단점

**schema를 사용할 때 생기는 장점**

- 주고받는 메시지의 스키마 관리가 용이합니다.
- Schema 호환성만 유지된다면, _특정 토픽에 여러 버전의 스키마 데이터_ 를 Produce/Consume이 가능합니다.
- 반복되는 값이 많다면 압축률이 상승됩니다(약간의 CPU 연산이 소모됩니다).

**schema를 사용할 때 생기는 단점**

- 초기 도입이 다소 까다롭습니다.
  - Avro Schema를 먼저 정의하고 스키마 레지스트리에 등록 후 그 대로 데이터를 보는데 시간이 어느정도 걸린다.
  - JSON 스키마나 Protobuf를 통한 스키마 정의도 마찬가지입니다.
- 스키마 레지스트리 의 역할이 굉장히 중요; 스키마 레지스트리 의 **장애**가 발생하는 경우 정상적으로 메시지를 **전달하지 못하게** 됩니다.
  - Kafka 만 운영하였을때와 비교했을 때, 운영포인트가 증가한다는 것을 의미합니다.
  - 그렇기 때문에 스키마 레지스트리도 분산운영을 할 수 있는 방안이 있는지 찾아봐야 합니다.
    ![img](https://docs.confluent.io/current/_images/multi-dc-setup-kafka.png)

스키마 레지스트리를 강요하지하지는 않지만, 많은 케이스 에서 [스키마 레지스트리 형식으로 포맷을 보장하기를 바라는 것으로 보입니다](https://www.confluent.io/blog/schema-registry-kafka-stream-processing-yes-virginia-you-really-need-one/).

# 마무리

이번 글을 통해, 아래 내용들을 살펴볼 수 있었습니다:

1. 아파치 카프카의 Produce/Consume 뿐 아니라 Streams, Connect 기능을 이용하여 데이터의 흐름을 추가적으로 제어할 수 있음을 알 수 있었습니다.
2. 데이터 흐름이 복잡해짐에 따라 데이터 직렬화/역직렬화에 대한 관리도구 및 직렬화/역직렬화 도구가 대두되었습니다. 이는 각각 스키마 레지스트리 및 Apache Avro를 말합니다.
3. 스키마 레지스트리와 Apache Avro에 대해 간략하게나마 살펴보고, 장단점을 살펴보았습니다.

다음 파트에선 ksqlDB를 명확히 이해하기 위해 Kafka Streams에 대해 명확히 알아보도록 합시다.

읽어주셔서 대단히 감사합니다.

---

- References
  - [Confluent Schema Registry Tutorial](https://docs.confluent.io/current/schema-registry/schema_registry_tutorial.html)
  - [Kafka 스키마 관리, Schema Registry](https://dol9.tistory.com/274)
