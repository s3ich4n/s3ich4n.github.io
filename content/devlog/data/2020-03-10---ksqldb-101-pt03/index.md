---
title: "ksqlDB 101, part 3. 실전 예시: 오픈소스를 통해 살펴보는 실시간 보안 이벤트 탐지 룰"
date: "2020-03-10T06:19:00.000Z"
template: "post"
draft: false
slug: "/devlog/data/2020-03-10-ksqldb-101-pt03"
category: "devlog"
tags:
  - "data_processing"
description: "ksqlDB을 활용한 오픈소스의 예시를 통해, 보안 이벤트를 실시간으로 걸러내는 방안에 대해 학습해보고 이를 토대로 어떤식으로 활용하면 좋을지 살펴봅시다."
socialImage: "./media/__j__.jpg"
---

이 글은 `ksqlDB`(당시에는 `KSQL`이라는 명칭이었습니다)를 학습하기 위해 정리한 연재글입니다.

이 글의 순서는 아래와 같습니다.

# 목차

1. [part 1. 배경지식](https://blog.s3ich4n.me/devlog/data/2020-02-05-ksqldb-101-pt01)
1. [part 2. Kafka Streams에 대해](https://blog.s3ich4n.me/devlog/data/2020-02-17-ksqldb-101-pt02)
1. part 3. 실전 예시: 오픈소스를 통해 살펴보는 실시간 보안 이벤트 탐지 룰

# 3. ksqlDB란?

- 카프카를 위한 Streaming SQL engine이며, Kafka Stream 기반으로 만들어졌습니다.
- 파트 2에 언급한 해당 개념 또한 모두 SQL 쿼리로 수행할 수 있습니다:

  - stateless processing(`Filtering`, `Mapping`의 개념)
  - stateful processing(`JOIN`, `Aggregation`의 개념),
    - 여러개의 스트림에 대해 실시간으로 JOIN 연산을 수행할 수도 있습니다.
  - windowing operations 를 지원합니다(`WINDOW TUMBLING`, 정의한 이상행위가 발생했다면 새로운 토픽에 씀)
    - 이를 활용한 Anomaly Detection이 가능합니다. (`WINDOW TUMBLING` 범위 설정등을 의미합니다.)

- SQL 기반의 real-time 앱을 작성하는데 쓰인다 (별도의 프로세싱)

  - 그런 이유로 카프카 브로커 위에서 작동하는게 아닙니다. <br />앞서 설명한 Kafka Streams API를 사용하는 앱처럼 구동됩니다.
  - ksqlDB에 맞는 SQL문을 작성 후 서비스를 구동하면 프로세싱이 됩니다!
  - User-defined Function은 Java/Scala로 사용하여 ksqlDB에 별도로 추가하여 구동하면 됩니다!

- ksqlDB를 통해 검증하고 배포하는 방법은 아래와 같습니다
  - SQL문을 별도로 준비해놓고 Interactive ksqlDB for development에서 쿼리를 개발한다
  - Headless ksqlDB inproduction... 필요에 따른 SQL구문을 준비하고 deploy한다
  - [참고링크](https://docs.ksqldb.io/en/latest/operate-and-deploy/how-it-works/#ksql-deployment-modes)

## ksqlDB을 도입한다면? \~어떤 관점에서 기술을 바라볼까\~

이벤트를 가공하여 필요한 카프카 토픽에 별도로 저장하거나 데이터를 저장하여 유의미한 데이터를 뽑아낼 수 있도록 하는 관점으로 바라봐야 한다는 것입니다.

이는 Apache Spark나 앞서 살펴본 Faust로도 가능하지만, ksqlDB는 이를 쿼리로 빠르게 작성하여 결과를 얻어볼 수 있다는 점에서 의의를 가집니다.

1. 빠른 테스트를 통해 데이터가 입증을 수행하고 고도화가 필요한 그 시점에 다른 기술을 통하여 비율절감, 성능개선을 수행하면 될 것으로 보입니다.

## ksqlDB 실전예시: HELK(Hunting ELK)

ksqlDB를 통해 Anomaly Detection을 수행하고자 하는 예시는 사이버보안 파트에서도 충분히 활용될 수 있는 문제입니다. 소개할 HELK라는 시스템은 이를 잘 활용한 훌륭한 오픈소스입니다. 해커의 고도화된 공격과 같은 **"이상행위"** 가 무엇인지 면밀히 이해한 후, 시스템 이벤트를 수집하고 이를 실시간으로 탐지하고 알림을 준다는 것이 주요 골자입니다.

![HELK의 전체 구조. 이 글에선 Kafka와 KSQL(현 ksqlDB)를 주요하게 살펴볼 것입니다](https://raw.githubusercontent.com/Cyb3rWard0g/HELK/master/docs/images/HELK-Design.png)

그렇다면, 이상행위를 어떻게 탐지하는지 살펴봅시다. 실제 HELK라는 큰 프로젝트에서 어떻게 쓰이는지는 [해당 링크](https://posts.specterops.io/real-time-sysmon-processing-via-ksql-and-helk-part-3-basic-use-case-8fbf383cb54f)를 참고해주세요(아래 Reference에도 기재해두었습니다).

## ksqlDB 쿼리 작성 (1)

WinlogBeat라는 프로그램을 통해 수집된 윈도우즈의 시스템 이벤트를 수집하는 스트림을 생성하였습니다. 아래 쿼리는 해당 내용을 ksqlDB가 해석하도록 하는 코드입니다.

```SQL
CREATE STREAM WINLOGBEAT_STREAM (
  source_name VARCHAR,
  type VARCHAR,
  task VARCHAR,
  log_name VARCHAR,
  computer_name VARCHAR,
  event_data STRUCT<
    UtcTime VARCHAR,
    ProcessGuid VARCHAR,
    ProcessId INTEGER,
    Image VARCHAR,
    FileVersion VARCHAR,
    Description VARCHAR,
    Product VARCHAR,
    Company VARCHAR,
    CommandLine VARCHAR,
    CurrentDirectory VARCHAR,
    User VARCHAR,
    LogonGuid VARCHAR,
    LogonId VARCHAR,
    TerminalSessionId INTEGER,
    IntegrityLevel VARCHAR,
    Hashes VARCHAR,
    ParentProcessGuid VARCHAR,
    ParentProcessId INTEGER,
    ParentImage VARCHAR,
    ParentCommandLine VARCHAR,
    Protocol VARCHAR,
    Initiated VARCHAR,
    SourceIsIpv6 VARCHAR,
    SourceIp VARCHAR,
    SourceHostname VARCHAR,
    SourcePort INTEGER,
    SourcePortName VARCHAR,
    DestinationIsIpv6 VARCHAR,
    DestinationIp VARCHAR,
    DestinationHostname VARCHAR,
    DestinationPort INTEGER,
    DestinationPortName VARCHAR
  >,
  event_id INTEGER)
WITH (KAFKA_TOPIC='winlogbeat', VALUE_FORMAT='JSON');
```

## ksqlDB 쿼리 작성 (2)

(1)에서 작성한 쿼리를 토대로, 별도의 스트림을 통해 키값을 새로 추가하여 새 스트림을 만들어낼 수도 있습니다. 아래는 해당 내용에 대한 쿼리입니다.

```sql
CREATE STREAM WINLOGBEAT_STREAM_REKEY
WITH (VALUE_FORMAT='JSON', PARTITIONS=1, TIMESTAMP='event_date_creation')
AS SELECT STRINGTOTIMESTAMP(event_data->UtcTime, 'yyyy-MM-dd HH:mm:ss.SSS')
AS
  event_date_creation,
  event_data->ProcessGuid AS process_guid,
  event_data->ProcessId AS process_id,
  event_data->Image AS process_path,
  event_data->FileVersion AS file_version,
  event_data->Description AS file_description,
  event_data->Company AS file_company,
  event_data->CommandLine AS process_command_line,
  event_data->CurrentDirectory AS process_current_directory,
  event_data->User AS user_account,
  event_data->LogonGuid AS user_logon_guid,
  event_data->LogonId AS user_logon_id,
  event_data->TerminalSessionId AS user_session_id,
  event_data->IntegrityLevel AS process_integrity_level,
  event_data->Hashes AS hashes,
  event_data->ParentProcessGuid AS parent_process_guid,
  event_data->ParentProcessId AS parent_process_id,
  event_data->ParentImage AS parent_process_path,
  event_data->ParentCommandLine AS parent_process_command_line,
  event_data->Protocol AS network_protocol,
  event_data->Initiated AS network_connection_initiated,
  event_data->SourceIsIpv6 AS src_is_ipv6,
  event_data->SourceIp AS src_ip_addr,
  event_data->SourceHostname AS src_host_name,
  event_data->SourcePort AS src_port,
  event_data->SourcePortName AS src_port_name,
  event_data->DestinationIsIpv6 AS dst_is_ipv6,
  event_data->DestinationIp AS dst_ip_addr,
  event_data->DestinationHostname AS dst_host_name,
  event_data->DestinationPort AS dst_port,
  event_data->DestinationPortName AS dst_port_name,
  event_id,
  source_name,
  log_name
FROM WINLOGBEAT_STREAM
WHERE source_name='Microsoft-Windows-Sysmon' PARTITION BY process_guid;
```

## ksqlDB 쿼리 작성 (3): 응용

앞서 작성한 내용을 통해, sysmon에서 유의미한 데이터를 가져오는 쿼리를 작성해보도록 합시다.

```sql
CREATE STREAM SYSMON_PROCESS_CREATE
WITH (VALUE_FORMAT='JSON', PARTITIONS=1, TIMESTAMP='event_date_creation')
AS SELECT
  event_date_creation,
  process_guid,
  process_id,
  process_path,
  file_version,
  file_description,
  file_company,
  process_command_line,
  process_current_directory,
  user_account,
  user_logon_guid,
  user_logon_id,
  user_session_id,
  process_integrity_level,
  hashes,
  parent_process_guid,
  parent_process_id,
  parent_process_path,
  parent_process_command_line,
  event_id,
  source_name,
  log_name
FROM WINLOGBEAT_STREAM_REKEY
WHERE event_id=1;
```

관련 내용을 테이블에 저장할 수도 있습니다:

```sql
CREATE TABLE SYSMON_PROCESS_CREATE_TABLE (
  event_date_creation VARCHAR,
  process_guid VARCHAR,
  process_id INTEGER,
  process_path VARCHAR,
  file_version VARCHAR,
  file_description VARCHAR,
  file_company VARCHAR,
  process_command_line VARCHAR,
  process_current_directory VARCHAR,
  user_account VARCHAR,
  user_logon_guid VARCHAR,
  user_logon_id VARCHAR,
  user_session_id INTEGER,
  process_integrity_level VARCHAR,
  hashes VARCHAR,
  parent_process_guid VARCHAR,
  parent_process_id INTEGER,
  parent_process_path VARCHAR,
  parent_process_command_line VARCHAR,
  event_id INTEGER,
  source_name VARCHAR,
  log_name VARCHAR)
WITH (KAFKA_TOPIC='SYSMON_PROCESS_CREATE', VALUE_FORMAT='JSON', KEY='process_guid');
```

## ksqlDB 쿼리 작성 (4): 이상행위 탐지

상기 과정을 이용하여, Lateral Movement 를 수행하여 타 PC에 "측면이동"을 하여 네트워크를 살펴보는 악성행위를 감지할 수 있습니다. 아래 내용이 해당 쿼리입니다.

```sql
CREATE STREAM SYSMON_JOIN WITH (PARTITIONS=1)
AS SELECT
  N.EVENT_DATE_CREATION,
  N.PROCESS_GUID,
  N.PROCESS_ID,
  N.PROCESS_PATH,
  N.USER_ACCOUNT,
  N.NETWORK_PROTOCOL,
  N.NETWORK_CONNECTION_INITIATED,
  N.SRC_IS_IPV6,
  N.SRC_IP_ADDR,
  N.SRC_HOST_NAME,
  N.SRC_PORT,
  N.SRC_PORT_NAME,
  N.DST_IS_IPV6,
  N.DST_IP_ADDR,
  N.DST_HOST_NAME,
  N.DST_PORT,
  N.DST_PORT_NAME,
  N.SOURCE_NAME,
  N.LOG_NAME,
  P.PROCESS_COMMAND_LINE,
  P.HASHES,
  P.PARENT_PROCESS_PATH,
  P.PARENT_PROCESS_COMMAND_LINE,
  P.USER_LOGON_GUID,
  P.USER_LOGON_ID,
  P.USER_SESSION_ID,
  P.PROCESS_CURRENT_DIRECTORY,
  P.PROCESS_INTEGRITY_LEVEL,
  P.PARENT_PROCESS_GUID,
  P.PARENT_PROCESS_ID
FROM SYSMON_NETWORK_CONNECT N INNER JOIN SYSMON_PROCESS_CREATE_TABLE P ON N.PROCESS_GUID = P.PROCESS_GUID;
```

## 마무리

이번 글을 통해, 아래 내용들을 살펴볼 수 있었습니다:

1. `ksqlDB`에 대해 이해하였습니다.
1. 의미있는 데이터를 추려낼 수 있도록 작업하는 것이 `ksqlDB`의 로직을 작성하는 핵심입니다.
1. 실전 예시를 통해, 어떤식으로 사용하는지에 대한 쿼리 작성법을 배웠습니다.

읽어주셔서 대단히 감사합니다.

---

References

- [KSQL Tutorials end Examples](https://docs.confluent.io/platform/current/ksqldb/tutorials/index.html)
- [KSQL and Kafka Streams](https://github.com/kafkakru/meetup/blob/master/conference/1st-conference/KSQL%20vs%20Kafka%20Streams.pdf)
- [HELK, Hunting ELK](https://www.confluent.io/ja-jp/blog/sysmon-security-event-processing-real-time-ksql-helk/)
- [Real-time sysmon processing via ksql and HELP pt.3](https://posts.specterops.io/real-time-sysmon-processing-via-ksql-and-helk-part-3-basic-use-case-8fbf383cb54f)
